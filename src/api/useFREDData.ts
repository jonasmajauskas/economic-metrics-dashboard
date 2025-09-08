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
  fedFunds: "FEDFUNDS",
  primeRate: "MPRIME",
  inflationCPI: "CPIAUCSL", // raw CPI, compute YoY later
  treasury10y: "DGS10",
  treasury2y: "DGS2",
  treasury30y: "DGS30",
  mortgage30y: "MORTGAGE30US",
  autoLoan60m: "RIFLPBCIANM60NM",   // ✅ correct ID
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
      const res = await fetch(
        `/api/fred/series/observations?series_id=${seriesId}&api_key=2455b05c18ab8ca246f2ff73f64a5aa6&file_type=json`
      );
      const json = await res.json();
      const obs: FredObservation[] = json.observations;

      if (!obs?.length) {
        return { seriesId, latest: null };
      }

      // Inflation special case: compute YoY % from CPIAUCSL
      if (key === "inflationCPI") {
        const latest = [...obs].reverse().find((o) => o.value !== ".");
        const twelveAgo = [...obs]
          .reverse()
          .find((o, i) => o.value !== "." && i > 12); // approx 12 months back
        if (latest && twelveAgo) {
          const value =
            ((parseFloat(latest.value) - parseFloat(twelveAgo.value)) /
              parseFloat(twelveAgo.value)) *
            100;
          return { seriesId, latest: { date: latest.date, value } };
        }
      }

      // Default case: just take latest non-missing value
      const latest = [...obs].reverse().find((o) => o.value !== ".");
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
  }, []);

  return { data, isLoading, error };
}
