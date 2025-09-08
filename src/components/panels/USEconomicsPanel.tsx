import React from 'react';
import { useFREDData } from '../../api/useFREDData';

interface RateData {
  name: string;
  value: number;
  previous: number;
  change: number;
}

const USEconomicsPanel: React.FC = () => {
  const { data, isLoading, error } = useFREDData();

  const getValue = (key: string): number | null => {
    const series = data?.[key];
    return series?.latest?.value ?? null;
  };

  const economicData: RateData[] = [
    { name: 'Fed Funds Rate', value: getValue('fedFunds') ?? 0, previous: 0, change: 0 },
    { name: 'Prime Rate', value: getValue('primeRate') ?? 0, previous: 0, change: 0 },
    { name: 'Inflation Rate', value: getValue('inflationCPI') ?? 0, previous: 0, change: 0 },
    { name: '10-Year Treasury', value: getValue('treasury10y') ?? 0, previous: 0, change: 0 },
    { name: '2-Year Treasury', value: getValue('treasury2y') ?? 0, previous: 0, change: 0 },
    { name: '30-Year Mortgage', value: getValue('mortgage30y') ?? 0, previous: 0, change: 0 },
    { name: '60-Month Auto Loan', value: getValue('autoLoan60m') ?? 0, previous: 0, change: 0 },
    { name: 'Avg Credit Card APR', value: getValue('creditCardAPR') ?? 0, previous: 0, change: 0 },
  ];

  if (isLoading) {
    return <p className="text-muted-foreground">Loading US economic data…</p>;
  }

  if (error) {
    return <p className="text-red-500">Error loading US economic data: {error}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex space-x-2">
        {economicData.map((item, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-lg p-3 w-44 flex-shrink-0"
          >
            <h3 className="text-xs text-muted-foreground mb-1 truncate">
              {item.name}
            </h3>
            <div className="flex items-baseline">
              <span className="text-xl font-bold">
                {item.value ? item.value.toFixed(2) : '–'}%
              </span>
              {item.change !== 0 && (
                <span
                  className={`ml-2 text-sm ${
                    item.name === 'Inflation Rate'
                      ? item.change <= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                      : item.change >= 0
                      ? 'text-red-500'
                      : 'text-green-500'
                  }`}
                >
                  {item.change >= 0 ? '+' : ''}
                  {item.change.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default USEconomicsPanel;