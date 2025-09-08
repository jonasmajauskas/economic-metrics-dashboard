import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useYahooBatchData } from '../../api/useFMPData';

const AssetsPanel: React.FC = () => {
  const assets = [
    { sym: 'BTC-USD', label: 'Bitcoin', badge: '₿' },
    { sym: 'ETH-USD', label: 'Ethereum', badge: 'Ξ' },
    // { sym: 'GCUSD',     label: 'Gold ETF (GLD)', badge: 'GCUSD' }, // ETF
    // { sym: 'USO',     label: 'Oil ETF (USO)',  badge: 'USO' }, // ETF
    // { sym: 'IAU',  label: 'Gold ETF (IAU)', badge: 'IAU' },
    // { sym: 'DBO',  label: 'Oil ETF (DBO)',  badge: 'DBO' },
  ] as const;

  const symbols = assets.map(a => a.sym);
  const { data, isLoading, error } = useYahooBatchData(symbols);

  const formatMoney = (v: number, currency?: string) => {
    const c = (currency || 'USD').toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: c,
        maximumFractionDigits: 2,
      }).format(v);
    } catch {
      const prefix = c === 'USD' ? '$' : `${c} `;
      return `${prefix}${v.toLocaleString()}`;
    }
  };

  const renderAssetCard = (sym: string, label: string, badge: string) => {
    if (isLoading) return <div key={sym} className="h-24 animate-pulse bg-muted rounded-lg" />;

    const q = data?.[sym];
    if (error || !q) {
      return (
        <div key={sym} className="h-24 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground">
          Error loading {sym}
        </div>
      );
    }

    const price  = Number(q.regularMarketPrice ?? 0);
    const change = Number(q.regularMarketChange ?? 0);
    const pct    = Number(q.regularMarketChangePercent ?? 0);
    const up     = change >= 0;

    return (
      <div key={sym} className="bg-card border border-border rounded-lg p-4 h-24">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{q.shortName || label}</h4>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
              {badge}
            </span>
          </div>
          {up ? <TrendingUp className="text-green-500" size={20} /> : <TrendingDown className="text-red-500" size={20} />}
        </div>

        <div className="mt-2 flex items-baseline">
          <span className="text-2xl font-bold">{formatMoney(price, q.currency)}</span>
          <span className={`ml-2 text-sm ${up ? 'text-green-500' : 'text-red-500'}`}>
            {up ? '+' : ''}{change.toFixed(2)} ({up ? '+' : ''}{pct.toFixed(2)}%)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Crypto row */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderAssetCard('BTC-USD', 'Bitcoin', '₿')}
          {renderAssetCard('ETH-USD', 'Ethereum', 'Ξ')}
        </div>
      </div>

      {/* Gold & Oil ETFs row (FIX: use GLD/USO, not XAUUSD=X/WTIUSD) */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderAssetCard('GLD', 'Gold ETF (GLD)', 'GLD')}
          {renderAssetCard('USO', 'Oil ETF (USO)', 'USO')}
          {/* Optional:
              {renderAssetCard('IAU', 'Gold ETF (IAU)', 'IAU')}
              {renderAssetCard('DBO', 'Oil ETF (DBO)', 'DBO')}
          */}
        </div>
      </div>
    </div>
  );
};

export default AssetsPanel;
