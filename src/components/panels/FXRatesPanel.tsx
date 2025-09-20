import React from 'react';
import { useYahooBatchData } from '../../api/useFMPData';
import { useECBDataRaw } from '../../api/useECBData';
import CountryFlag from '../CountryFlag';

interface FXPair {
  pair: string;   // e.g., "USD/EUR"
  base: string;   // flag code for USD side
  quote: string;  // flag code for quote side
  value: number;  // quote units per 1 USD
  change: number; // change in the "value" (if available)
  quoteLabel: string; // e.g., "EUR"
}

// Invert a quote (X/Y -> Y/X) with proper change math when possible.
function invertQuote(price?: number, change?: number) {
  const p = Number(price);
  const c = Number(change);
  if (!isFinite(p) || p === 0) return { value: 0, change: 0 };
  if (isFinite(c)) {
    const prev = p - c;
    if (prev !== 0) {
      const invPrice = 1 / p;
      const invPrev = 1 / prev;
      return { value: invPrice, change: invPrice - invPrev };
    }
  }
  return { value: 1 / p, change: 0 };
}

const FXRatesPanel: React.FC = () => {
  // ECB: This series returns USD per EUR (i.e., how many USD for 1 EUR).
  // We'll invert it to get EUR per USD to match our "1 USD = x EUR" display.
  const { data: eurUsdEcbData } = useECBDataRaw({
    endpoint: 'EXR/D.USD.EUR.SP00.A', // USD per EUR from ECB
    params: { startPeriod: '2025-01-01' },
  });

  // Yahoo-style tickers:
  // 'CNY=X'    -> USD/CNY (CNY per USD)
  // 'CHF=X'    -> USD/CHF (CHF per USD)
  // 'JPY=X'    -> USD/JPY (JPY per USD)
  // 'GBPUSD=X' -> GBP/USD (USD per GBP) -> invert to USD/GBP (GBP per USD)
  const symbols = ['CNY=X', 'GBPUSD=X', 'CHF=X', 'JPY=X'];
  const { data: fxData } = useYahooBatchData(symbols);

  // Safely extract latest USD per EUR from ECB, then invert for EUR per USD.
  let eurPerUsdFromEcb = 0;
  if (eurUsdEcbData?.dataSets?.[0]) {
    try {
      const series = eurUsdEcbData.dataSets[0].series;
      const firstKey = Object.keys(series)[0];
      const obs = series[firstKey]?.observations;
      if (obs) {
        const idx = Object.keys(obs).map(Number).sort((a, b) => a - b);
        const last = idx.at(-1);
        if (last !== undefined) {
          const usdPerEur = Number(obs[last][0] ?? 0); // USD per 1 EUR
          if (isFinite(usdPerEur) && usdPerEur > 0) {
            eurPerUsdFromEcb = 1 / usdPerEur; // EUR per 1 USD
          }
        }
      }
    } catch {
      eurPerUsdFromEcb = 0;
    }
  }

  // Pull raw rows from Yahoo
  const cnyRow = fxData?.['CNY=X'];       // USD/CNY
  const chfRow = fxData?.['CHF=X'];       // USD/CHF
  const jpyRow = fxData?.['JPY=X'];       // USD/JPY
  const gbpUsdRow = fxData?.['GBPUSD=X']; // GBP/USD (needs inversion to USD/GBP)

  // Invert GBP/USD -> USD/GBP (GBP per 1 USD)
  const usdGbp = invertQuote(gbpUsdRow?.regularMarketPrice, gbpUsdRow?.regularMarketChange);

  // Build consistent “1 USD = x QUOTE” list
  const fxPairs: FXPair[] = [
    {
      pair: 'USD/EUR',
      base: 'us',
      quote: 'eu',
      value: eurPerUsdFromEcb, // EUR per USD
      change: 0,               // ECB series doesn't provide intraday change
      quoteLabel: 'EUR',
    },
    {
      pair: 'USD/CNY',
      base: 'us',
      quote: 'china',
      value: Number(cnyRow?.regularMarketPrice ?? 0),        // CNY per USD
      change: Number(cnyRow?.regularMarketChange ?? 0),
      quoteLabel: 'CNY',
    },
    {
      pair: 'USD/GBP',
      base: 'us',
      quote: 'uk',
      value: usdGbp.value,                                    // GBP per USD
      change: usdGbp.change,
      quoteLabel: 'GBP',
    },
    {
      pair: 'USD/CHF',
      base: 'us',
      quote: 'switzerland',
      value: Number(chfRow?.regularMarketPrice ?? 0),         // CHF per USD
      change: Number(chfRow?.regularMarketChange ?? 0),
      quoteLabel: 'CHF',
    },
    {
      pair: 'USD/JPY',
      base: 'us',
      quote: 'japan',
      value: Number(jpyRow?.regularMarketPrice ?? 0),         // JPY per USD
      change: Number(jpyRow?.regularMarketChange ?? 0),
      quoteLabel: 'JPY',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {fxPairs.map((pair, index) => {
          const hasVal = Number.isFinite(pair.value) && pair.value > 0;
          const valStr = hasVal ? pair.value.toFixed(4) : '—';
          const chgStr =
            Number.isFinite(pair.change) && pair.change !== 0
              ? `${pair.change >= 0 ? '+' : ''}${pair.change.toFixed(4)}`
              : '+0.0000';

          return (
            <div key={index} className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <CountryFlag country={pair.base} size="sm" />
                <span className="text-xs">/</span>
                <CountryFlag country={pair.quote} size="sm" />
                <h4 className="text-sm font-medium ml-1">{pair.pair}</h4>
              </div>

              <div className="flex items-baseline">
                <span className="text-lg font-bold">{valStr}</span>
                <span
                  className={`ml-1 text-xs ${
                    (pair.change ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {chgStr}
                </span>
              </div>

              {/* New: explicit text "1 USD = x {currency}" */}
              <div className="mt-1 text-xs text-muted-foreground">
                1 USD = {valStr} {pair.quoteLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tiny legend to clarify sources */}
      <p className="mt-2 text-[10px] text-muted-foreground">
        USD/EUR from ECB (daily reference); other pairs from Yahoo-style quotes. Values shown as
        quote currency per 1 USD.
      </p>
    </div>
  );
};

export default FXRatesPanel;