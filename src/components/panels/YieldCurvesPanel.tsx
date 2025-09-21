import React from 'react';
import { useFREDData } from '../../api/useFREDData';

const fmt = (n: number | null, digits = 2) =>
  n == null || !isFinite(n) ? '—' : n.toFixed(digits);

// ----------------- Spread helpers -----------------
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

// Narrative functions
function describe3m18m(v: number | null) {
  if (v == null) return 'No data.';
  const bucket = bucketSpread(v);
  return v >= 0
    ? `Normal (${bucket.label}): 1Y yields exceed 3M bills, implying markets expect policy to stay tight or even tighten further.`
    : `Inverted (${bucket.label}): 3M bills yield more than 1Y notes — markets anticipate Fed rate cuts within ~12 months.`;
}

function describe2s10s(v: number | null) {
  if (v == null) return 'No data.';
  const bucket = bucketSpread(v);
  return v >= 0
    ? `Normal curve (${bucket.label}): 10Y yields exceed 2Y yields, usually signaling steady growth/inflation expectations.`
    : `Inverted curve (${bucket.label}): 2Y exceeds 10Y — often a recession warning as markets expect future rate cuts.`;
}

function describe2s30s(v: number | null) {
  if (v == null) return 'No data.';
  const bucket = bucketSpread(v);
  return v >= 0
    ? `Normal (${bucket.label}): 30Y exceeds 2Y, reflecting long-run growth/inflation expectations.`
    : `Inverted (${bucket.label}): 2Y exceeds 30Y — a stronger late-cycle signal than 2s10s.`;
}

const YieldCurvesPanel: React.FC = () => {
  const { data, isLoading, error } = useFREDData();

  // Raw yields
  const threeM = data.treasury3m?.latest?.value ?? null;
  const treasury1y = data.treasury1y?.latest?.value ?? null;
  const twoY = data.treasury2y?.latest?.value ?? null;
  const tenY = data.treasury10y?.latest?.value ?? null;
  const thirty = data.treasury30y?.latest?.value ?? null;

  // Spreads
  const spread3m1y =
    treasury1y !== null && threeM !== null ? treasury1y - threeM : null;
  const spread2s10s =
    tenY != null && twoY != null ? tenY - twoY : null;
  const spread2s30s =
    thirty != null && twoY != null ? thirty - twoY : null;

  if (isLoading)
    return <p className="text-muted-foreground">Loading treasury yields…</p>;
  if (error)
    return (
      <p className="text-red-500">Error loading treasury yields: {error}</p>
    );

  return (
    <div className="space-y-6">
      {/* Yields (side by side) */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">US Treasury Yields</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { tenor: '3M', value: threeM },
            { tenor: '1Y', value: treasury1y },
            { tenor: '2Y', value: twoY },
            { tenor: '10Y', value: tenY },
            { tenor: '30Y', value: thirty },
          ].map((y) => (
            <div key={y.tenor}>
              <h4 className="text-sm text-muted-foreground mb-1">
                {y.tenor} Treasury
              </h4>
              <span className="text-2xl font-bold">{fmt(y.value)}%</span>
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-lg font-medium mb-2">Term Spreads</h3>

      {/* 1Y3M Spread */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm text-muted-foreground mb-1">1Y3M Spread</h4>
        <span
          className={`text-3xl font-bold ${spread3m1y == null
              ? 'text-muted-foreground'
              : spread3m1y >= 0
                ? 'text-green-500'
                : 'text-red-500'
            }`}
        >
          {fmt(spread3m1y)}%
        </span>
        <p className="text-xs text-muted-foreground mt-2">
          {describe3m18m(spread3m1y)}
        </p>
      </div>

      {/* 2s10s Spread */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm text-muted-foreground mb-1">2s10s Spread</h4>
        <span
          className={`text-3xl font-bold ${spread2s10s == null
              ? 'text-muted-foreground'
              : spread2s10s >= 0
                ? 'text-green-500'
                : 'text-red-500'
            }`}
        >
          {fmt(spread2s10s)}%
        </span>
        <p className="text-xs text-muted-foreground mt-2">
          {describe2s10s(spread2s10s)}
        </p>
      </div>

      {/* 2s30s Spread */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm text-muted-foreground mb-1">2s30s Spread</h4>
        <span
          className={`text-3xl font-bold ${spread2s30s == null
              ? 'text-muted-foreground'
              : spread2s30s >= 0
                ? 'text-green-500'
                : 'text-red-500'
            }`}
        >
          {fmt(spread2s30s)}%
        </span>
        <p className="text-xs text-muted-foreground mt-2">
          {describe2s30s(spread2s30s)}
        </p>
      </div>
    </div>
  );
};

export default YieldCurvesPanel;
