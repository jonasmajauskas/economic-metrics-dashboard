import React from 'react';
import { useFREDData } from '../../api/useFREDData';

interface YieldData {
  tenor: string;
  value: number | null;
  previous: number | null;
  change: number | null;
}

const fmt = (n: number | null, digits = 2) =>
  n == null || !isFinite(n) ? '—' : n.toFixed(digits);

// Bucket the spread by magnitude to give users context
function bucketSpread(v: number) {
  const bps = Math.abs(v) * 100;
  if (v >= 0) {
    if (bps < 25) return { label: 'flat / just positive', tone: 'mild' };
    if (bps < 100) return { label: 'moderately steep', tone: 'medium' };
    return { label: 'steep', tone: 'strong' };
  } else {
    if (bps < 25) return { label: 'slightly inverted', tone: 'mild' };
    if (bps < 75) return { label: 'moderately inverted', tone: 'medium' };
    return { label: 'deeply inverted', tone: 'strong' };
  }
}

// Rich narrative for each spread
function describe2s10s(v: number | null) {
  if (v == null) return 'No data.';
  const bucket = bucketSpread(v);
  if (v >= 0) {
    return `Normal curve (${bucket.label}): 10-year yields exceed 2-year yields. This usually signals a healthy term premium and expectations for steady growth/inflation over time. 
A **rising** 2s10s (steepening) often appears early in expansions; a **falling** 2s10s (flattening) can signal late-cycle dynamics as policy tightens.`;
  }
  return `Inverted curve (${bucket.label}): short rates (2Y) are above long rates (10Y). Markets expect tighter policy to bite and/or future rate cuts. 
Historically, persistent 2s10s inversions often precede recessions, but timing is uncertain — an inversion can last months. Watch whether the inversion is **deepening** (risk signal) or **narrowing** (normalization).`;
}

function describe2s30s(v: number | null) {
  if (v == null) return 'No data.';
  const bucket = bucketSpread(v);
  if (v >= 0) {
    return `Normal (${bucket.label}): 30-year yields exceed 2-year yields, reflecting long-run growth/inflation expectations and term premium. 
A **steepening** 2s30s can indicate improving long-run sentiment or a rise in term premium.`;
  }
  return `Inverted (${bucket.label}): 2-year exceeds 30-year — a stronger late-cycle signal than 2s10s. 
Deep inversions often reflect tight policy, lower long-run growth expectations, or strong demand for duration. A **narrowing** inversion suggests the curve is healing.`;
}

const YieldCurvesPanel: React.FC = () => {
  const { data, isLoading, error } = useFREDData();

  const twoY   = data.treasury2y?.latest?.value ?? null;   // DGS2
  const tenY   = data.treasury10y?.latest?.value ?? null;  // DGS10
  const thirty = data.treasury30y?.latest?.value ?? null;  // DGS30

  const prev2Y: number | null = null;   // hook currently doesn't expose “previous”
  const prev10Y: number | null = null;
  const prev30Y: number | null = null;

  const yieldsData: YieldData[] = [
    { tenor: '2Y',  value: twoY,   previous: prev2Y,  change: twoY   != null && prev2Y  != null ? twoY   - prev2Y  : null },
    { tenor: '10Y', value: tenY,   previous: prev10Y, change: tenY   != null && prev10Y != null ? tenY   - prev10Y : null },
    { tenor: '30Y', value: thirty, previous: prev30Y, change: thirty != null && prev30Y != null ? thirty - prev30Y : null },
  ];

  // Spreads (percentage points; e.g., -0.35 = -35 bps)
  const spread2s10s = (tenY != null && twoY != null) ? tenY - twoY : null;
  const spread2s30s = (thirty != null && twoY != null) ? thirty - twoY : null;

  if (isLoading) return <p className="text-muted-foreground">Loading treasury yields…</p>;
  if (error)     return <p className="text-red-500">Error loading treasury yields: {error}</p>;

  return (
    <div>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">US Treasury Yields</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {yieldsData.map((y) => (
              <div key={y.tenor} className="bg-card border border-border rounded-lg p-4">
                <h4 className="text-sm text-muted-foreground mb-1">
                  {y.tenor} Treasury
                </h4>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold">{fmt(y.value)}%</span>
                  {y.change != null && (
                    <span
                      className={`ml-2 text-sm ${
                        y.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {y.change >= 0 ? '+' : ''}{fmt(y.change)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Key Spreads</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Spreads are shown in percentage points (100 bps = 1.00%). Positive = normal curve. Negative = inverted.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2s10s */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">2s10s Spread (10Y − 2Y)</h4>
                  <div className="flex items-baseline">
                    <span
                      className={`text-3xl font-bold ${
                        spread2s10s == null
                          ? 'text-muted-foreground'
                          : spread2s10s >= 0
                            ? 'text-green-500'
                            : 'text-red-500'
                      }`}
                    >
                      {fmt(spread2s10s)}%
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {spread2s10s == null ? '—' : spread2s10s >= 0 ? 'Normal' : 'Inverted'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground max-w-[360px] whitespace-pre-line">
                  {describe2s10s(spread2s10s)}
                </p>
              </div>
            </div>

            {/* 2s30s */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">2s30s Spread (30Y − 2Y)</h4>
                  <div className="flex items-baseline">
                    <span
                      className={`text-3xl font-bold ${
                        spread2s30s == null
                          ? 'text-muted-foreground'
                          : spread2s30s >= 0
                            ? 'text-green-500'
                            : 'text-red-500'
                      }`}
                    >
                      {fmt(spread2s30s)}%
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {spread2s30s == null ? '—' : spread2s30s >= 0 ? 'Normal' : 'Inverted'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground max-w-[360px] whitespace-pre-line">
                  {describe2s30s(spread2s30s)}
                </p>
              </div>
            </div>
          </div>

          {/* How to read box */}
          <div className="mt-4 bg-muted/40 border border-border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">How to read curve spreads</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>
                <span className="font-medium">Sign:</span> Positive = normal (long &gt; short). Negative = inverted (short &gt; long).
              </li>
              <li>
                <span className="font-medium">Magnitude:</span> ~0–0.25% = flat; 0.25–1.00% = moderate; &gt;1.00% = steep.
                For inversions: &lt;−0.25% = notable, &lt;−0.75% = deep.
              </li>
              <li>
                <span className="font-medium">Trend:</span> Rising spread = <em>steepening</em>; falling spread = <em>flattening</em>.
                Inversions that deepen are a stronger risk signal; narrowing inversions hint at normalization.
              </li>
              <li>
                <span className="font-medium">Context:</span> Curves are indicators, not timers. Inversions can persist; watch policy,
                growth, inflation, and credit conditions along with spreads.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default YieldCurvesPanel;