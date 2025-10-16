// src/api/useWorldBankData.ts
import { useEffect, useState } from "react";

type ByCountryValue = Record<
  string,
  { period: string | number | null; value: number | null }
>;

type SeriesHistoryPoint = { period: number; value: number | null };
type ByCountryHistory = Record<string, SeriesHistoryPoint[]>;

const BASE = "https://api.worldbank.org/v2/country";

// Keep both ISO-2 (for your UI) and ISO-3 (for World Bank API)
const COUNTRIES: Record<
  string,
  { name: string; iso2: string; iso3: string }
> = {
  JP: { name: "Japan",          iso2: "JP", iso3: "JPN" },
  CN: { name: "China",          iso2: "CN", iso3: "CHN" },
  US: { name: "United States",  iso2: "US", iso3: "USA" },
  RU: { name: "Russia",         iso2: "RU", iso3: "RUS" },
  IN: { name: "India",          iso2: "IN", iso3: "IND" },

  // ✅ New countries
  PL: { name: "Poland",         iso2: "PL", iso3: "POL" },
  AR: { name: "Argentina",      iso2: "AR", iso3: "ARG" },
  BR: { name: "Brazil",         iso2: "BR", iso3: "BRA" },
};

// World Bank indicators
const INDICATORS = {
  gdp: "NY.GDP.MKTP.CD",            // GDP (current US$)
  gdpPerCapita: "NY.GDP.PCAP.CD",   // GDP per capita (current US$)
  inflation: "FP.CPI.TOTL.ZG",      // Inflation (CPI, annual % YoY)
  unemployment: "SL.UEM.TOTL.ZS",   // Unemployment (%)
  bondYields: "FR.INR.LEND",        // Lending (proxy for interest rates)

  // Nominal wages proxy (Compensation of Employees, current LCU)
  // We'll compute YoY % change and then subtract CPI YoY to approximate real wage growth.
  wagesNominalLCU: "GC.XPN.COMP.CN",
};

// ---------- Fetch helpers ----------

// Minimal fetch: returns only the latest value per country (ISO2)
async function fetchIndicatorLatest(
  wbIso3List: string[],
  indicator: string
): Promise<ByCountryValue> {
  const url = `${BASE}/${wbIso3List.join(
    ";"
  )}/indicator/${indicator}?format=json&per_page=20000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const rows = (json?.[1] || []) as any[];
  const out: ByCountryValue = {};

  // ISO3 -> ISO2 map
  const iso3ToIso2: Record<string, string> = {};
  for (const key of Object.keys(COUNTRIES)) {
    const { iso2, iso3 } = COUNTRIES[key];
    iso3ToIso2[iso3] = iso2;
  }

  for (const row of rows) {
    const v = row.value;
    if (v == null) continue;

    const iso3 = row.countryiso3code as string; // e.g., "USA"
    const iso2 = iso3ToIso2[iso3];              // e.g., "US"
    if (!iso2) continue;

    const periodNum = Number(row.date);
    const prev = out[iso2];

    if (!prev || periodNum > Number(prev.period)) {
      out[iso2] = { period: periodNum, value: Number(v) };
    }
  }
  return out;
}

// Full history fetch: returns arrays of {period, value} per country (ISO2)
async function fetchIndicatorHistory(
  wbIso3List: string[],
  indicator: string
): Promise<ByCountryHistory> {
  const url = `${BASE}/${wbIso3List.join(
    ";"
  )}/indicator/${indicator}?format=json&per_page=20000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const rows = (json?.[1] || []) as any[];

  const iso3ToIso2: Record<string, string> = {};
  for (const key of Object.keys(COUNTRIES)) {
    const { iso2, iso3 } = COUNTRIES[key];
    iso3ToIso2[iso3] = iso2;
  }

  const out: ByCountryHistory = {};
  for (const row of rows) {
    const iso3 = row.countryiso3code as string;
    const iso2 = iso3ToIso2[iso3];
    if (!iso2) continue;

    const period = Number(row.date);
    const value = row.value == null ? null : Number(row.value);

    if (!out[iso2]) out[iso2] = [];
    out[iso2].push({ period, value });
  }

  // sort ascending by period and drop nulls
  for (const k of Object.keys(out)) {
    out[k] = out[k]
      .filter(p => p.value != null && Number.isFinite(p.value))
      .sort((a, b) => a.period - b.period);
  }

  return out;
}

// Compute YoY % change series from a history series
function computeYoYGrowth(
  hist: SeriesHistoryPoint[]
): SeriesHistoryPoint[] {
  const out: SeriesHistoryPoint[] = [];
  for (let i = 1; i < hist.length; i++) {
    const prev = hist[i - 1];
    const curr = hist[i];
    if (!prev.value || !curr.value) continue;
    // YoY % = (curr/prev - 1) * 100
    const yoy = (curr.value / prev.value - 1) * 100;
    out.push({ period: curr.period, value: yoy });
  }
  return out;
}

// Index a history series by period for quick lookup
function indexByPeriod(
  hist: SeriesHistoryPoint[]
): Record<number, number> {
  const map: Record<number, number> = {};
  for (const p of hist) {
    if (p.value != null && Number.isFinite(p.value)) {
      map[p.period] = p.value!;
    }
  }
  return map;
}

export function useWorldBankData() {
  const [gdpData, setGdpData] = useState<ByCountryValue | null>(null);
  const [gdpPerCapitaData, setGdpPerCapitaData] = useState<ByCountryValue | null>(null);
  const [inflationData, setInflationData] = useState<ByCountryValue | null>(null);
  const [unemploymentData, setUnemploymentData] = useState<ByCountryValue | null>(null);
  const [interestRateData, setInterestRateData] = useState<ByCountryValue | null>(null);

  // 👉 New output: Real Wage Growth YoY (%), approximated as nominal wage YoY − CPI YoY
  const [realWageGrowthData, setRealWageGrowthData] = useState<ByCountryValue | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use ISO-3 for the API request
        const wbCodes = Object.values(COUNTRIES).map(c => c.iso3);

        // Fetch latest (single-value) series
        const [gdp, gdpPc, infl, unemp, bond] = await Promise.all([
          fetchIndicatorLatest(wbCodes, INDICATORS.gdp),
          fetchIndicatorLatest(wbCodes, INDICATORS.gdpPerCapita),
          fetchIndicatorLatest(wbCodes, INDICATORS.inflation),
          fetchIndicatorLatest(wbCodes, INDICATORS.unemployment),
          fetchIndicatorLatest(wbCodes, INDICATORS.bondYields),
        ]);

        // Fetch full histories needed to compute real wage growth
        const [wageHist, inflHist] = await Promise.all([
          fetchIndicatorHistory(wbCodes, INDICATORS.wagesNominalLCU),
          fetchIndicatorHistory(wbCodes, INDICATORS.inflation),
        ]);

        // Compute: Real Wage Growth YoY ≈ Nominal Wage Growth YoY − CPI YoY
        const realWageGrowth: ByCountryValue = {};
        for (const iso2 of Object.keys(wageHist)) {
          const wages = wageHist[iso2];
          if (!wages || wages.length < 2) continue;

          const wageYoY = computeYoYGrowth(wages); // % YoY
          if (!wageYoY.length) continue;

          // align by period with inflation YoY (already YoY %)
          const inflByPeriod = indexByPeriod(inflHist[iso2] || []);

          // pick the latest overlapping year
          let best: { period: number; value: number } | null = null;
          for (let i = wageYoY.length - 1; i >= 0; i--) {
            const p = wageYoY[i];
            const cpi = inflByPeriod[p.period];
            if (cpi != null && Number.isFinite(cpi)) {
              const real = p.value! - cpi; // approximation
              best = { period: p.period, value: real };
              break;
            }
          }

          if (best) {
            realWageGrowth[iso2] = { period: best.period, value: best.value };
          }
        }

        // Set state
        setGdpData(gdp);
        setGdpPerCapitaData(gdpPc);
        setInflationData(infl);
        setUnemploymentData(unemp);
        setInterestRateData(bond);
        setRealWageGrowthData(Object.keys(realWageGrowth).length ? realWageGrowth : null);

      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e.message || "World Bank fetch failed");
      } finally {
        setIsLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  return {
    gdpData,
    gdpPerCapitaData,
    inflationData,
    unemploymentData,
    interestRateData,
    realWageGrowthData,  // 👉 new
    isLoading,
    error
  };
}
