import React from 'react';
import CountryFlag from '../CountryFlag';

// Local helper types (match what the hooks return)
type ByCountryMillion = Record<
  string,
  { period: string | number | null; valueMillion: number | null }
>;
type ByCountryValue = Record<
  string,
  { period: string | number | null; value: number | null }
>;

type MacroeconomicPanelProps = {
  gdpData?: ByCountryMillion | null;       // values in "millions of local currency" per your source
  gdpPerCapitaData?: ByCountryValue | null;// values in "local currency per person"
  inflationData?: ByCountryValue | null;   // %
  unemploymentData?: ByCountryValue | null;// %
  interestRateData?: ByCountryValue | null;// %
  mortgageRateData?: ByCountryValue | null;// (unused here)
};

// Country map (display names + your flag codes)
const REF_AREA_MAP: Record<string, { name: string; code: string }> = {
  // --- ECB countries (EUR) ---
  DE: { name: 'Germany',     code: 'germany' },
  FR: { name: 'France',      code: 'france' },
  ES: { name: 'Spain',       code: 'spain' },
  NL: { name: 'Netherlands', code: 'netherlands' },
  IT: { name: 'Italy',       code: 'italy' },
  LT: { name: 'Lithuania',   code: 'lithuania' },
  EE: { name: 'Estonia',     code: 'estonia' },
  LV: { name: 'Latvia',      code: 'latvia' },

  // --- Others (local currencies) ---
  US: { name: 'United States', code: 'US' },
  RU: { name: 'Russia',        code: 'RU' },
  CN: { name: 'China',         code: 'china' },
  JP: { name: 'Japan',         code: 'japan' },
  IN: { name: 'India',         code: 'india' },
};

// Per-country currency (no conversion — just formatting)
const CURRENCY_BY_REF: Record<
  string,
  { code: string; symbol: string; perCapitaDecimals?: number }
> = {
  // Euro area
  DE: { code: 'EUR', symbol: '€' },
  FR: { code: 'EUR', symbol: '€' },
  ES: { code: 'EUR', symbol: '€' },
  NL: { code: 'EUR', symbol: '€' },
  IT: { code: 'EUR', symbol: '€' },
  LT: { code: 'EUR', symbol: '€' },
  EE: { code: 'EUR', symbol: '€' },
  LV: { code: 'EUR', symbol: '€' },

  // Others
  US: { code: 'USD', symbol: '$' },
  JP: { code: 'JPY', symbol: '¥', perCapitaDecimals: 0 }, // JPY often shown without decimals
  CN: { code: 'CNY', symbol: '¥' },
  RU: { code: 'RUB', symbol: '₽' },
  IN: { code: 'INR', symbol: '₹' },
};

// ---------- formatters (no FX conversion) ----------

// GDP comes in *millions of local currency*. Convert to trillions or billions for display.
function formatGDPLocal(millionsLocal: number, symbol: string) {
  const trillions = millionsLocal / 1_000_000; // 1,000,000 million = 1 trillion
  if (trillions >= 1) return `${symbol}${trillions.toFixed(2)}T`;
  const billions = millionsLocal / 1_000;      // 1,000 million = 1 billion
  return `${symbol}${Math.round(billions).toLocaleString()}B`;
}

function formatPerCapitaLocal(amount: number, symbol: string, decimals = 0) {
  const v = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${v.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })}`;
}

const MacroeconomicPanel: React.FC<MacroeconomicPanelProps> = ({
  gdpData,
  gdpPerCapitaData,
  inflationData,
  unemploymentData,
  interestRateData,
}) => {
  const rows = Object.entries(REF_AREA_MAP)
    .map(([ref, { name, code }]) => {
      const cur = CURRENCY_BY_REF[ref] ?? { code: 'USD', symbol: '$' };

      const gdpMillionLocal = Number(gdpData?.[ref]?.valueMillion ?? 0); // millions of *local* currency
      const perCapitaLocal  = Number(gdpPerCapitaData?.[ref]?.value ?? 0); // local currency / person
      const inflationPct    = Number(inflationData?.[ref]?.value ?? 0);
      const unemploymentPct = Number(unemploymentData?.[ref]?.value ?? 0);
      const interestRate    = Number(interestRateData?.[ref]?.value ?? 0);

      // Pre-format for the UI (no conversions)
      const gdpDisplay        = formatGDPLocal(gdpMillionLocal, cur.symbol);
      const gdpPerCapitaDisp  = formatPerCapitaLocal(
        perCapitaLocal,
        cur.symbol,
        cur.perCapitaDecimals ?? 0
      );

      // For sorting by GDP size, use trillions (still local currency; just numeric for ranking)
      const gdpTrillionsLocal = gdpMillionLocal / 1_000_000;

      return {
        ref,
        name,
        code,
        currencyCode: cur.code,
        currencySymbol: cur.symbol,
        gdpTrillionsLocal,
        gdpDisplay,
        gdpPerCapitaDisp,
        inflation: Number.isFinite(inflationPct) ? inflationPct : 0,
        unemployment: Number.isFinite(unemploymentPct) ? unemploymentPct : 0,
        interestRate: Number.isFinite(interestRate) ? interestRate : 0,
      };
    })
    // Sort by GDP (local) descending for a sensible order
    .sort((a, b) => b.gdpTrillionsLocal - a.gdpTrillionsLocal);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-secondary/50 text-secondary-foreground">
            <th className="px-4 py-2 text-left font-medium">Country</th>
            <th className="px-4 py-2 text-center font-medium">GDP (local)</th>
            <th className="px-4 py-2 text-center font-medium">GDP/capita (local)</th>
            <th className="px-4 py-2 text-center font-medium">Inflation</th>
            <th className="px-4 py-2 text-center font-medium">Unemployment</th>
            <th className="px-4 py-2 text-center font-medium">Bond Yields</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={r.code}
              className={`border-b border-border ${
                idx % 2 === 0 ? 'bg-background' : 'bg-secondary/10'
              }`}
            >
              {/* Country + currency code for clarity */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <CountryFlag country={r.code} size="sm" />
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">({r.currencyCode})</span>
                </div>
              </td>

              {/* GDP in local currency (pretty-printed) */}
              <td className="px-4 py-3 text-center tabular-nums">
                <span className="font-medium">{r.gdpDisplay}</span>
              </td>

              {/* GDP per capita in local currency */}
              <td className="px-4 py-3 text-center tabular-nums">
                <span className="font-medium">{r.gdpPerCapitaDisp}</span>
              </td>

              {/* Other metrics unchanged */}
              <td className="px-4 py-3 text-center tabular-nums">
                <span className="font-medium">{r.inflation.toFixed(1)}%</span>
              </td>
              <td className="px-4 py-3 text-center tabular-nums">
                <span className="font-medium">{r.unemployment.toFixed(1)}%</span>
              </td>
              <td className="px-4 py-3 text-center tabular-nums">
                <span className="font-medium">{r.interestRate.toFixed(2)}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tiny legend so future-you remembers it’s local currency */}
      <p className="mt-2 text-[10px] text-muted-foreground">
        GDP values shown in each country’s local currency (no FX conversion). “T” = trillions, “B” = billions of local currency units.
      </p>
    </div>
  );
};

export default MacroeconomicPanel;
