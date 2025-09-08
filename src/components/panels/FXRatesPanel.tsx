import React from 'react';
import { useYahooBatchData } from '../../api/useFMPData';
import { useECBDataRaw } from '../../api/useECBData';
import CountryFlag from '../CountryFlag';

interface FXPair {
  pair: string;
  base: string;   // flag code
  quote: string;  // flag code
  value: number;
  change: number;
}

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
  // USD/EUR from ECB (series key already encodes USD vs EUR)
  const { data: eurUsdEcbData } = useECBDataRaw({
    endpoint: 'EXR/D.USD.EUR.SP00.A', // interpreted as USD/EUR
    params: { startPeriod: '2025-01-01' },
  });

  // Yahoo-style tickers (USD first unless noted)
  // - 'CNY=X'      -> USD/CNY
  // - 'CHF=X'      -> USD/CHF
  // - 'JPY=X'      -> USD/JPY
  // - 'GBPUSD=X'   -> GBP/USD (invert to USD/GBP)
  const symbols = ['CNY=X', 'GBPUSD=X', 'CHF=X', 'JPY=X'];
  const { data: fxData } = useYahooBatchData(symbols);

  // Extract USD/EUR safely from ECB
  let usdEurRate = 0;
  if (eurUsdEcbData?.dataSets?.[0]) {
    try {
      const series = eurUsdEcbData.dataSets[0].series;
      const firstKey = Object.keys(series)[0];
      const obs = series[firstKey]?.observations;
      if (obs) {
        const idx = Object.keys(obs).map(Number).sort((a, b) => a - b);
        const last = idx.at(-1);
        if (last !== undefined) {
          usdEurRate = Number(obs[last][0] ?? 0); // already USD/EUR
        }
      }
    } catch {
      usdEurRate = 0;
    }
  }

  // Pull raw rows
  const cnyRow = fxData?.['CNY=X'];       // USD/CNY
  const chfRow = fxData?.['CHF=X'];       // USD/CHF
  const jpyRow = fxData?.['JPY=X'];       // USD/JPY
  const gbpUsdRow = fxData?.['GBPUSD=X']; // GBP/USD (needs inversion)

  // Invert GBP/USD -> USD/GBP
  const usdGbp = invertQuote(gbpUsdRow?.regularMarketPrice, gbpUsdRow?.regularMarketChange);

  // Display list (USD first in every pair name)
  const fxPairs: FXPair[] = [
    {
      pair: 'USD/EUR',
      base: 'us',
      quote: 'eu',
      value: usdEurRate,
      change: 0, // ECB feed doesn’t include change; compute from two points if desired
    },
    {
      pair: 'USD/CNY',
      base: 'us',
      quote: 'china',
      value: Number(cnyRow?.regularMarketPrice ?? 0),
      change: Number(cnyRow?.regularMarketChange ?? 0),
    },
    {
      pair: 'USD/GBP',
      base: 'us',
      quote: 'uk',
      value: usdGbp.value,
      change: usdGbp.change,
    },
    {
      pair: 'USD/CHF',
      base: 'us',
      quote: 'switzerland',
      value: Number(chfRow?.regularMarketPrice ?? 0),
      change: Number(chfRow?.regularMarketChange ?? 0),
    },
    {
      pair: 'USD/JPY',
      base: 'us',
      quote: 'japan',
      value: Number(jpyRow?.regularMarketPrice ?? 0),
      change: Number(jpyRow?.regularMarketChange ?? 0),
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {fxPairs.map((pair, index) => (
          <div key={index} className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <CountryFlag country={pair.base} size="sm" />
              <span className="text-xs">/</span>
              <CountryFlag country={pair.quote} size="sm" />
              <h4 className="text-sm font-medium ml-1">{pair.pair}</h4>
            </div>
            <div className="flex items-baseline">
              <span className="text-lg font-bold">{pair.value ? pair.value.toFixed(4) : '—'}</span>
              <span
                className={`ml-1 text-xs ${
                  pair.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {pair.change ? (pair.change >= 0 ? '+' : '') + pair.change.toFixed(4) : '+0.0000'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FXRatesPanel;
