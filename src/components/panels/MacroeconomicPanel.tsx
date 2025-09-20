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
  gdpData?: ByCountryMillion | null;        // values in "millions of currency" (we display as USD)
  gdpPerCapitaData?: ByCountryValue | null; // values in "currency per person" (we display as USD)
  inflationData?: ByCountryValue | null;    // %
  unemploymentData?: ByCountryValue | null; // %
  interestRateData?: ByCountryValue | null; // %
  mortgageRateData?: ByCountryValue | null; // (unused here)
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

  // --- Others
  US: { name: 'United States', code: 'US' },
  RU: { name: 'Russia',        code: 'RU' },
  CN: { name: 'China',         code: 'china' },
  JP: { name: 'Japan',         code: 'japan' },
  IN: { name: 'India',         code: 'india' },
};

// ---------- USD-only formatters (no FX conversion here) ----------

// GDP comes in *millions*. We render as $ trillions/billions for readability.
function formatGDPUSD(millions: number) {
  const trillions = millions / 1_000_000; // 1,000,000 million = 1 trillion
  if (trillions >= 1) return `$${trillions.toFixed(2)}T`;
  const billions = millions / 1_000;      // 1,000 million = 1 billion
  return `$${Math.round(billions).toLocaleString()}B`;
}

// Per-capita displayed as USD; default no decimals (tweak if you prefer 0/2)
function formatPerCapitaUSD(amount: number, decimals = 0) {
  const v = Number.isFinite(amount) ? amount : 0;
  return `$${v.toLocaleString(undefined, {
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
      const gdpMillion = Number(gdpData?.[ref]?.valueMillion ?? 0);  // millions (treated/displayed as USD)
      const perCapita  = Number(gdpPerCapitaData?.[ref]?.value ?? 0); // per person (treated/displayed as USD)
      const inflation  = Number(inflationData?.[ref]?.value ?? 0);
      const unemp      = Number(unemploymentData?.[ref]?.value ?? 0);
      const rate       = Number(interestRateData?.[ref]?.value ?? 0);

      // Pre-format for the UI (USD only)
      const gdpDisplay        = formatGDPUSD(gdpMillion);
      const gdpPerCapitaDisp  = formatPerCapitaUSD(perCapita, 0);

      // For sorting by GDP size, use trillions (numeric)
      const gdpTrillions = gdpMillion / 1_000_000;

      return {
        ref,
        name,
        code,
        gdpTrillions,
        gdpDisplay,
        gdpPerCapitaDisp,
        inflation: Number.isFinite(inflation) ? inflation : 0,
        unemployment: Number.isFinite(unemp) ? unemp : 0,
        interestRate: Number.isFinite(rate) ? rate : 0,
      };
    })
    // Sort by GDP (descending)
    .sort((a, b) => b.gdpTrillions - a.gdpTrillions);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-secondary/50 text-secondary-foreground">
            <th className="px-4 py-2 text-left font-medium">Country</th>
            <th className="px-4 py-2 text-center font-medium">GDP (USD)</th>
            <th className="px-4 py-2 text-center font-medium">GDP/capita (USD)</th>
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
              {/* Country only (no currency code shown) */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <CountryFlag country={r.code} size="sm" />
                  <span className="font-medium">{r.name}</span>
                </div>
              </td>

              {/* GDP in USD (pretty-printed) */}
              <td className="px-4 py-3 text-center tabular-nums">
                <span className="font-medium">{r.gdpDisplay}</span>
              </td>

              {/* GDP per capita in USD */}
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

      {/* Legend: clarify that we're displaying USD without converting here */}
      <p className="mt-2 text-[10px] text-muted-foreground">
        Values displayed in USD. If your source data is not already in USD, wire in FX conversion before formatting.
      </p>
    </div>
  );
};

export default MacroeconomicPanel;
