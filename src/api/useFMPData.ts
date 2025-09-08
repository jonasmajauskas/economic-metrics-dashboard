// useYahooBatchData.ts (gold & oil friendly, premium-safe)
import { useEffect, useMemo, useState } from 'react';

type Quote = {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  exchange?: string;
};

// 1) allow GLD/USO
const PREMIUM_BLOCKLIST = new Set<string>([
  'GC=F', 'CL=F', '^NDX', '000300.SS',
  'RUB=X', 'USDRUB',
  // 'QQQ', 'GLD', 'USO', 'ASHR', 'CLUSD',  <-- remove GLD, USO
  'QQQ', 'ASHR', 'CLUSD',
]);

// 2) explicitly substitute to ETFs you want
const SUBSTITUTE: Record<string, string> = {
  '^NDX': '^RUT',
  'XAUUSD': 'GCUSD',   // gold spot -> GLD ETF
  'WTIUSD': 'USO',   // WTI spot  -> USO ETF
};


// Treat these as USD if API omits currency
const USD_COMMODITIES = new Set(['WTIUSD', 'BRENTUSD']);

// --------- symbol normalization ---------
function mapFxSymbol(yahooFx: string): string | null {
  // 'GBPUSD=X' => 'GBPUSD'
  if (/^[A-Z]{6}=X$/.test(yahooFx)) return yahooFx.replace('=X', '');
  // 'CNY=X' => 'USDCNY'
  if (/^[A-Z]{3}=X$/.test(yahooFx)) return `USD${yahooFx.replace('=X', '')}`;
  return null;
}

function mapCryptoSymbol(yahooCrypto: string): string | null {
  if (/^[A-Z]{2,5}-USD$/i.test(yahooCrypto)) {
    return yahooCrypto.replace('-USD', 'USD').toUpperCase();
  }
  return null;
}

const INDEX_PASSTHRU = new Set(['^GSPC', '^DJI', '^STOXX50E', '^FTSE', '^N225', '^HSI', '^RUT']);

function normalizeSymbols(symbols: string[]) {
  const fxPairs: string[] = [];
  const originalToFmp: Record<string, string | null> = {};

  for (const raw of symbols) {
    let s = SUBSTITUTE[raw] ?? raw;

    if (PREMIUM_BLOCKLIST.has(s)) {
      originalToFmp[raw] = null;
      continue;
    }

    // FX (this covers XAUUSD=X -> XAUUSD for spot gold)
    const fx = mapFxSymbol(s);
    if (fx) {
      originalToFmp[raw] = PREMIUM_BLOCKLIST.has(fx) ? null : fx;
      if (originalToFmp[raw]) fxPairs.push(fx);
      continue;
    }

    // Crypto (BTC-USD -> BTCUSD, etc.)
    const crypto = mapCryptoSymbol(s);
    if (crypto) {
      originalToFmp[raw] = PREMIUM_BLOCKLIST.has(crypto) ? null : crypto;
      continue;
    }

    // Indices you know are OK
    if (INDEX_PASSTHRU.has(s)) {
      originalToFmp[raw] = s;
      continue;
    }

    // Everything else as-is (e.g., WTIUSD, BRENTUSD)
    originalToFmp[raw] = PREMIUM_BLOCKLIST.has(s) ? null : s;
  }

  return { fxPairs, originalToFmp };
}

// --------- FMP fetch ---------
const FMP_STABLE_ROOT = 'https://financialmodelingprep.com/stable';
const FMP_API_KEY = 'BX1Qm3tOvweExXBVyL30Uqu05KCtBWPb';

type FmpQuoteRow = {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changesPercentage?: number | string;
  exchange?: string;
  currency?: string;
  previousClose?: number;
};

function withKey(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(FMP_API_KEY)}`;
}

async function fetchStableQuote(sym: string): Promise<FmpQuoteRow | null> {
  const url = withKey(`${FMP_STABLE_ROOT}/quote?symbol=${encodeURIComponent(sym)}`);
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    console.warn(`[FMP] ${res.status} ${res.statusText} for ${sym} :: ${text.slice(0, 200)}`);
    return null;
  }
  try {
    const json = text ? JSON.parse(text) : null;
    const row = Array.isArray(json) ? json[0] : json;
    return row && typeof row === 'object' ? (row as FmpQuoteRow) : null;
  } catch {
    console.warn(`[FMP] JSON parse error for ${sym}`);
    return null;
  }
}

async function stableQuoteBatch(symbols: string[], chunkSize = 8): Promise<FmpQuoteRow[]> {
  const out: FmpQuoteRow[] = [];
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(s => fetchStableQuote(s)));
    for (const r of results) if (r) out.push(r);
  }
  return out;
}

function parseChangePct(
  cp: FmpQuoteRow['changesPercentage'],
  fallbackPrev?: number,
  price?: number,
  change?: number
) {
  if (typeof cp === 'string') {
    const n = parseFloat(cp);
    if (!Number.isNaN(n)) return n;
  } else if (typeof cp === 'number') {
    return cp;
  }
  if (fallbackPrev && price != null && change != null && fallbackPrev !== 0) {
    return (change / fallbackPrev) * 100;
  }
  return 0;
}

// --------- hook ---------
export function useYahooBatchData(symbols: string[]) {
  const [data, setData] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const uniqueSymbols = useMemo(
    () => Array.from(new Set(symbols.filter(Boolean))),
    [symbols]
  );

  useEffect(() => {
    let aborted = false;

    async function run() {
      if (!uniqueSymbols.length) {
        setData({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const { fxPairs, originalToFmp } = normalizeSymbols(uniqueSymbols);

      try {
        const fmpUniverse = Array.from(
          new Set(
            Object.values(originalToFmp).filter((v): v is string => Boolean(v && v.trim()))
          )
        );

        if (!fmpUniverse.length) {
          if (!aborted) {
            setData({});
            setIsLoading(false);
          }
          return;
        }

        const rows = await stableQuoteBatch(fmpUniverse, 8);
        const bySym = new Map<string, FmpQuoteRow>(
          rows.map(r => [String(r.symbol || '').toUpperCase(), r])
        );

        const out: Record<string, Quote> = {};

        for (const orig of uniqueSymbols) {
          const fmpSym = originalToFmp[orig];
          if (!fmpSym) continue;

          const row = bySym.get(fmpSym.toUpperCase());
          if (!row) continue;

          const price = row.price ?? 0;
          const prev =
            row.previousClose ??
            (row.price != null && row.change != null ? row.price - row.change : undefined);
          const change = row.change ?? (prev != null ? price - prev : 0);
          const changePct = parseChangePct(row.changesPercentage, prev, price, change);

          const isFxMapped = fxPairs.includes(fmpSym);
          const currency =
            isFxMapped
              ? fmpSym.slice(3) // e.g., XAUUSD -> USD
              : (row.currency || (USD_COMMODITIES.has(fmpSym) ? 'USD' : undefined));

          out[orig] = {
            symbol: orig,
            shortName: row.name || fmpSym,
            regularMarketPrice: price,
            regularMarketChange: change,
            regularMarketChangePercent: changePct,
            currency,
            exchange: row.exchange,
          };
        }

        if (!aborted) {
          setData(out);
          setIsLoading(false);
          setError(null);
          console.log('[FMP] ✅ Stable batch parsed (gold & oil enabled, premium-safe):', out);
        }
      } catch (e: any) {
        if (!aborted) {
          setIsLoading(false);
          setError(e?.message || 'Failed to fetch FMP stable quotes');
        }
      }
    }

    run();
    return () => { aborted = true; };
  }, [uniqueSymbols.join(',')]);

  return { data, isLoading, error };
}
