// src/api/useWorldBankData.ts
import { useEffect, useState } from "react";

type ByCountryValue = Record<
  string,
  { period: string | number | null; value: number | null }
>;

const BASE = "https://api.worldbank.org/v2/country";

// Countries: Japan, China, USA, Russia, India
const COUNTRIES = {
  JP: { name: "Japan", code: "japan" },
  CN: { name: "China", code: "china" },
  US: { name: "United States", code: "usa" },
  RU: { name: "Russia", code: "russia" },
  IN: { name: "India", code: "india" },
};

// World Bank indicators
const INDICATORS = {
  gdp: "NY.GDP.MKTP.CD",        // GDP (current US$)
  gdpPerCapita: "NY.GDP.PCAP.CD", // GDP per capita (current US$)
  inflation: "FP.CPI.TOTL.ZG",  // Inflation (CPI, annual %)
  unemployment: "SL.UEM.TOTL.ZS", // Unemployment (%)
  bondYields: "FR.INR.LEND",    // Lending rate (proxy for interest rates)
};

async function fetchIndicator(
  countryCodes: string[],
  indicator: string
): Promise<ByCountryValue> {
  const url = `${BASE}/${countryCodes.join(";")}/indicator/${indicator}?format=json&per_page=1000`;
//   console.log("[WB] 🔍 Fetching:", url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const rows = (json?.[1] || []) as any[];
  const out: ByCountryValue = {};

  for (const row of rows) {
    if (!row.value) continue;
    const ref = row.countryiso3code;
    const prev = out[ref];
    const newPeriod = row.date;
    if (!prev || Number(newPeriod) > Number(prev.period)) {
      out[ref] = { period: newPeriod, value: row.value };
    }
  }
  return out;
}

export function useWorldBankData() {
  const [gdpData, setGdpData] = useState<ByCountryValue | null>(null);
  const [gdpPerCapitaData, setGdpPerCapitaData] = useState<ByCountryValue | null>(null);
  const [inflationData, setInflationData] = useState<ByCountryValue | null>(null);
  const [unemploymentData, setUnemploymentData] = useState<ByCountryValue | null>(null);
  const [interestRateData, setInterestRateData] = useState<ByCountryValue | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const codes = Object.keys(COUNTRIES);

        const [gdp, gdpPc, infl, unemp, bond] = await Promise.all([
          fetchIndicator(codes, INDICATORS.gdp),
          fetchIndicator(codes, INDICATORS.gdpPerCapita),
          fetchIndicator(codes, INDICATORS.inflation),
          fetchIndicator(codes, INDICATORS.unemployment),
          fetchIndicator(codes, INDICATORS.bondYields),
        ]);

        setGdpData(gdp);
        setGdpPerCapitaData(gdpPc);
        setInflationData(infl);
        setUnemploymentData(unemp);
        setInterestRateData(bond);

        // console.log("[WB] ✅ Parsed:", { gdp, gdpPc, infl, unemp, bond });
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e.message || "World Bank fetch failed");
      } finally {
        setIsLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  return { gdpData, gdpPerCapitaData, inflationData, unemploymentData, interestRateData, isLoading, error };
}