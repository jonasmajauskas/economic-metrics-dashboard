import { useEffect, useState } from "react";

type FredObservation = { date: string; value: string };

type FredSeries = {
  seriesId: string;
  latest: { date: string; value: number | null } | null;
};

const FRED_SERIES: Record<string, string> = {
  fedFunds: "FEDFUNDS",
  primeRate: "MPRIME",
  inflationCPI: "CPIAUCSL",
  treasury10y: "DGS10",
  treasury2y: "DGS2",
  treasury30y: "DGS30",
  mortgage30y: "MORTGAGE30US",
  autoLoan60m: "RIFLPBCIANM60NM",
  creditCardAPR: "TERMCBCCALLNS",
};

type FredSeriesKey = keyof typeof FRED_SERIES;
type FredData = Record<FredSeriesKey, FredSeries>;

export function useFREDData() {
  const [data, setData] = useState<Partial<FredData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeries(seriesId: string, key: FredSeriesKey) {
      const url = `/api/fred/series/observations?series_id=${encodeURIComponent(seriesId)}`;

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await res.text();
      if (!res.ok) {
        // Surface the upstream error so you can see it in DevTools
        throw new Error(`FRED ${res.status} ${res.statusText} :: ${text.slice(0, 200)}`);
      }

      const json = JSON.parse(text) as { observations?: FredObservation[] };
      const obs = json.observations || [];
      if (!obs.length) return { seriesId, latest: null };

      // Find latest non-missing value
      const latest = [...obs].reverse().find((o) => o.value !== ".");
      if (!latest) return { seriesId, latest: null };

      // Special case: CPI YoY from CPIAUCSL
      if (key === "inflationCPI") {
        // find a point ~12 months earlier with non-missing value
        const rev = [...obs].reverse();
        const latestIdx = rev.findIndex((o) => o.value !== ".");
        const twelveAgo = rev.slice(latestIdx + 12).find((o) => o.value !== ".");
        if (twelveAgo) {
          const vNow = parseFloat(latest.value);
          const vThen = parseFloat(twelveAgo.value);
          const yoy = Number.isFinite(vNow) && Number.isFinite(vThen) && vThen !== 0
            ? ((vNow - vThen) / vThen) * 100
            : null;
          return { seriesId, latest: { date: latest.date, value: yoy } };
        }
      }

      return {
        seriesId,
        latest: { date: latest.date, value: parseFloat(latest.value) },
      };
    }

    async function loadAll() {
      try {
        const results = await Promise.all(
          Object.entries(FRED_SERIES).map(async ([key, id]) => {
            const series = await fetchSeries(id, key as FredSeriesKey);
            return [key, series] as const;
          })
        );
        setData(Object.fromEntries(results) as Partial<FredData>);
      } catch (err: any) {
        setError(err?.message || "Failed to load FRED");
      } finally {
        setIsLoading(false);
      }
    }

    loadAll();
  }, []);

  return { data, isLoading, error };
}
