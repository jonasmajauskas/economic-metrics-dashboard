import { useEffect, useState } from "react";

type FredObservation = {
  date: string;
  value: string;
};

type FredSeries = {
  seriesId: string;
  latest: { date: string; value: number | null } | null;
};

const FRED_SERIES: Record<string, string> = {
  fedFunds: "DFF",
  primeRate: "MPRIME",
  inflationCPI: "CPIAUCSL",
  treasury10y: "DGS10",
  treasury2y: "DGS2",
  treasury30y: "DGS30",
  mortgage30y: "MORTGAGE30US",
  autoLoan60m: "RIFLPBCIANM60NM",
  creditCardAPR: "TERMCBCCALLNS",
  treasury3m: "DGS3MO",   // works
  treasury1y: "DGS1",     // closest instead of 18M
};



type FredSeriesKey = keyof typeof FRED_SERIES;
type FredData = Record<FredSeriesKey, FredSeries>;

export function useFREDData() {
  const [data, setData] = useState<Partial<FredData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const apiKey = import.meta.env.VITE_FRED_API_KEY;

  useEffect(() => {
    async function fetchSeries(seriesId: string, key: FredSeriesKey) {
      const url = `/api/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;

      // console.log("API KEY from env:", import.meta.env.VITE_FRED_API_KEY);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`FRED request failed: ${res.status}`);
      const json = await res.json();
      const obs: FredObservation[] = json.observations;

    if (seriesId === "FEDFUNDS") {
      console.log("---- fedFunds", json);
      console.log("---- 1Y Observations ----", obs.slice(-5)); // last 5 obs
    }
      if (!obs?.length) {
        return { seriesId, latest: null };
      }

      // Special case: compute YoY % for CPIAUCSL
      if (key === "inflationCPI") {
        const latest = [...obs].reverse().find(o => o.value !== ".");
        
        const twelveAgo = [...obs].reverse().find((o, i) => o.value !== "." && i > 12);
        if (latest && twelveAgo) {
          const value =
            ((parseFloat(latest.value) - parseFloat(twelveAgo.value)) /
              parseFloat(twelveAgo.value)) *
            100;
          return { seriesId, latest: { date: latest.date, value } };
        }
      }

      // Default: take latest non-missing value
      const latest = [...obs].reverse().find(o => o.value !== ".");
//       if (seriesId === "DGS1") {
//   console.log("1Y selected latest:", latest);
// }
      return {
        seriesId,
        latest: latest
          ? { date: latest.date, value: parseFloat(latest.value) }
          : null,
      };
    }

    async function loadAll() {
      try {
        const results = await Promise.all(
          Object.entries(FRED_SERIES).map(async ([key, id]) => {
            const series = await fetchSeries(id, key as FredSeriesKey);
            return [key, series];
          })
        );
        setData(Object.fromEntries(results) as Partial<FredData>);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAll();
  }, [apiKey]);

  return { data, isLoading, error };
}
