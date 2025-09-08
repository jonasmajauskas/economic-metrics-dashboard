import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useYahooBatchData } from '../../api/useFMPData';

const FLAG_MAP: Record<string, string> = {
  '^GSPC': '🇺🇸',      // S&P 500
  '^NDX': '🇺🇸',       // Nasdaq 100
  '^DJI': '🇺🇸',       // Dow
  '^STOXX50E': '🇪🇺',  // Euro Stoxx 50
  '^FTSE': '🇬🇧',      // FTSE 100
  '^N225': '🇯🇵',      // Nikkei 225
  '^HSI': '🇭🇰',       // Hang Seng
  // '000300.SS': '🇨🇳',  // CSI 300
};

const GlobalIndicesPanel: React.FC = () => {
  const symbols = Object.keys(FLAG_MAP);

  const { data, isLoading, error } = useYahooBatchData(symbols);

  const renderIndexCard = (symbol: string) => {
    if (isLoading) {
      return <div key={symbol} className="h-24 animate-pulse bg-muted rounded-lg"></div>;
    }

    if (error || !data?.[symbol]) {
      return (
        <div
          key={symbol}
          className="h-24 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground"
        >
          Error loading {symbol}
        </div>
      );
    }

    const q = data[symbol];
    const price = q.regularMarketPrice ?? 0;
    const change = q.regularMarketChange ?? 0;
    const changePercent = q.regularMarketChangePercent ?? 0;
    const isPositive = change >= 0;
    const flag = FLAG_MAP[symbol];

    return (
      <div key={symbol} className="bg-card border border-border rounded-lg p-4 h-24 mb-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{flag}</span>
              <h4 className="font-medium">{q.shortName || symbol}</h4>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {symbol}
              </span>
            </div>
          </div>
          {isPositive ? (
            <TrendingUp className="text-green-500" size={20} />
          ) : (
            <TrendingDown className="text-red-500" size={20} />
          )}
        </div>
        <div className="mt-2 flex items-baseline">
          <span className="text-xl font-bold">{price.toLocaleString()}</span>
          <span
            className={`ml-2 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(2)} ({isPositive ? '+' : ''}
            {changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['^GSPC', '^NDX', '^DJI'].map(renderIndexCard)}
        </div>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['^STOXX50E', '^FTSE'].map(renderIndexCard)}
        </div>
      </div>

      {/* <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['^N225', '^HSI', '000300.SS'].map(renderIndexCard)}
        </div>
      </div> */}
    </div>
  );
};

export default GlobalIndicesPanel;