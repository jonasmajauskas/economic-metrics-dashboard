// src/api/useECBData.ts
import { useEffect, useMemo, useState } from "react";

type EcbRequest = {
  endpoint: string;
  params?: Record<string, string>;
};

type ByCountryMillion = Record<
  string,
  { period: string | number | null; valueMillion: number | null }
>;
type ByCountryValue = Record<
  string,
  { period: string | number | null; value: number | null }
>;

const BASE = "/api/ecb/service/data";
const COUNTRIES = "DE+FR+ES+NL+IT+LT+EE+LV";

/* ------------------------------
 * Defaults you already have
 * ------------------------------ */

// GDP (annual, million EUR)
const DEFAULT_GDP_REQ: EcbRequest = {
  endpoint:
    "MNA/A.N.DE+FR+ES+NL+IT+LT+EE+LV.W2.S1.S1.B.B1GQ._Z._Z._Z.EUR.V.N",
  params: { startPeriod: "2015" },
};

// Inflation (monthly HICP y/y %)
const DEFAULT_INFL_REQ: EcbRequest = {
  endpoint: `ICP/M.${COUNTRIES}.N.000000.4.ANR`,
  params: { startPeriod: "2019-01" },
};

/* ------------------------------
 * Raw SDMX fetch (generic)
 * ------------------------------ */
export function useECBDataRaw<T = any>(
  req: string | EcbRequest | null | undefined = DEFAULT_GDP_REQ
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!req) return;

    const buildUrl = (r: string | EcbRequest) => {
      if (typeof r === "string") {
        const u = new URL(`${BASE}/${r}`, window.location.origin);
        u.searchParams.set("format", "jsondata");
        return u.toString();
      } else {
        const u = new URL(`${BASE}/${r.endpoint}`, window.location.origin);
        Object.entries(r.params ?? {}).forEach(([k, v]) =>
          u.searchParams.set(k, v)
        );
        if (!u.searchParams.has("format")) u.searchParams.set("format", "jsondata");
        return u.toString();
      }
    };

    const url = buildUrl(req);
    const ac = new AbortController();
    setIsLoading(true);
    setError(null);

    // console.log("[ECB] 🔄 Fetching:", url);

    fetch(url, {
      headers: { Accept: "application/json" },
      signal: ac.signal,
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        // console.log("[ECB] 📥 Raw response:", json);
        setData(json);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e.message || "Unknown error");
      })
      .finally(() => setIsLoading(false));

    return () => ac.abort();
  }, [JSON.stringify(req ?? DEFAULT_GDP_REQ)]);

  return { data, isLoading, error };
}

/* ------------------------------
 * GDP totals (million EUR) parsed by country
 * ------------------------------ */
export function useECBDataByCountry(
  req: string | EcbRequest | null | undefined = DEFAULT_GDP_REQ
) {
  const { data: raw, isLoading, error } = useECBDataRaw<any>(req);
  const [byCountry, setByCountry] = useState<ByCountryMillion | null>(null);

  useEffect(() => {
    if (!raw) return;
    const parsed = latestByCountryMillion(raw);
    // console.log("[ECB] ✅ Parsed GDP byCountry (million EUR):", parsed);
    setByCountry(parsed);
  }, [raw]);

  return { data: byCountry, isLoading, error };
}

/* ------------------------------
 * Inflation (HICP y/y %) parsed by country
 * ------------------------------ */
export function useECBInflationByCountry(
  req: string | EcbRequest | null | undefined = DEFAULT_INFL_REQ
) {
  const { data: raw, isLoading, error } = useECBDataRaw<any>(req);
  const [byCountry, setByCountry] = useState<ByCountryValue | null>(null);

  useEffect(() => {
    if (!raw) return;
    const parsed = latestByCountryValue(raw);
    // console.log("[ECB] ✅ Parsed Inflation byCountry (y/y %):", parsed);
    if (parsed) {
      // console.table(
      //   Object.entries(parsed).map(([ref, v]) => ({
      //     ref_area: ref,
      //     period: v.period,
      //     inflation_yoy_pct: v.value,
      //   }))
      // );
    }
    setByCountry(parsed);
  }, [raw]);

  return { data: byCountry, isLoading, error };
}

/* ------------------------------
 * Unemployment rate (% of active pop), parsed by country
 * Tries multiple candidate series (monthly/quarterly, SA/NSA)
 * and returns the first that works.
 * ------------------------------ */

export function useECBUnemploymentByCountry(countries: string = COUNTRIES) {
  const [data, setData] = useState<ByCountryValue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const EUROSTAT_BASE = "/api/eurostat";
  const startPeriod = "2019-01";

  // Helper: decode flat Eurostat indices
  function decodeIndex(idx: number, sizes: number[]) {
    const coords: number[] = [];
    for (let i = sizes.length - 1; i >= 0; i--) {
      coords[i] = idx % sizes[i];
      idx = Math.floor(idx / sizes[i]);
    }
    return coords;
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        const url = new URL(`${EUROSTAT_BASE}/une_rt_m`, window.location.origin);
        url.searchParams.set("freq", "M");
        url.searchParams.set("s_adj", "SA");
        url.searchParams.set("unit", "PC_ACT");
        url.searchParams.set("sex", "T");
        countries.replace(/\+/g, ",").split(",").forEach(c => url.searchParams.append("geo", c));
        url.searchParams.set("sinceTimePeriod", startPeriod);



        // console.log("[EUROSTAT] 🔍 Fetch:", url.toString());

        const res = await fetch(url.toString(), { signal: ac.signal, cache: "no-store" });
        if (!res.ok) {
          setError(`Eurostat unemployment HTTP ${res.status}`);
          return;
        }

        const json = await res.json();
        const { id, size, dimension, value } = json;

        // console.log("ids:", id);
        // console.log("size:", size);
        // console.log("geo index:", dimension.geo.category.index);
        // console.log(
        //   "time index sample:",
        //   Object.keys(dimension.time.category.index).slice(0, 5)
        // );
        // console.log("values sample:", Object.entries(value).slice(0, 10));

        const geoIndex = dimension.geo.category.index;
        const timeIndex = dimension.time.category.index;
        const timeLabels = dimension.time.category.label;

        const byCountry: ByCountryValue = {};

        for (const [flatKey, val] of Object.entries(value)) {
          if (val == null) continue;

          const coords = decodeIndex(Number(flatKey), size);

          const geoIdx = coords[id.indexOf("geo")];
          const timeIdx = coords[id.indexOf("time")];

          const geoCode = Object.keys(geoIndex).find((k) => geoIndex[k] === geoIdx);
          const timeCode = Object.keys(timeIndex).find((k) => timeIndex[k] === timeIdx);

          if (geoCode && timeCode) {
            const current = byCountry[geoCode];
            const newPeriod = timeLabels[timeCode];
            if (!current || new Date(newPeriod) > new Date(current.period as string)) {
              byCountry[geoCode] = { period: newPeriod, value: val as number };
            }
          }
        }

        // console.log("[EUROSTAT] ✅ Parsed unemployment:", byCountry);
        setData(byCountry);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e.message || "Unemployment fetch failed");
      } finally {
        setIsLoading(false);
      }
    })();

    return () => ac.abort();
  }, [countries]);

  return { data, isLoading, error };
}


/* ------------------------------
 * Long-term gov't bond yields (Maastricht criterion) by country (% pa)
 * Source: Eurostat dataset irt_lt_mcby_m (monthly)
 * ------------------------------ */
export function useEurostatLongTermRatesByCountry(
  countries: string = COUNTRIES,
  startPeriod: string = "2019-01"
) {
  const [data, setData] = useState<ByCountryValue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const EUROSTAT_BASE = "/api/eurostat";

  // Local helper (flat index → coordinates), same pattern as in unemployment hook
  function decodeIndex(idx: number, sizes: number[]) {
    const coords: number[] = [];
    for (let i = sizes.length - 1; i >= 0; i--) {
      coords[i] = idx % sizes[i];
      idx = Math.floor(idx / sizes[i]);
    }
    return coords;
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        // Eurostat: EMU convergence criterion - long-term government bond yields
        const url = new URL(`${EUROSTAT_BASE}/irt_lt_mcby_m`, window.location.origin);
        url.searchParams.set("freq", "M");      // monthly
        url.searchParams.set("int_rt", "MCBY"); // Maastricht criterion series
        countries.replace(/\+/g, ",").split(",").forEach((c) => url.searchParams.append("geo", c));
        url.searchParams.set("sinceTimePeriod", startPeriod);

        // console.log("[EUROSTAT] 🔍 Fetch long-term rates:", url.toString());

        const res = await fetch(url.toString(), { signal: ac.signal, cache: "no-store" });
        if (!res.ok) {
          setError(`Eurostat long-term rates HTTP ${res.status}`);
          return;
        }

        const json = await res.json();
        const { id, size, dimension, value } = json;

        // Debug
        // console.log("ids:", id);
        // console.log("size:", size);
        // console.log("geo index:", dimension.geo?.category?.index);
        // console.log("time index sample:", Object.keys(dimension.time?.category?.index ?? {}).slice(0, 5));
        // console.log("values sample:", Object.entries(value).slice(0, 10));

        const geoIndex = dimension.geo.category.index;
        const timeIndex = dimension.time.category.index;
        const timeLabels = dimension.time.category.label;

        const byCountry: ByCountryValue = {};

        for (const [flatKey, v] of Object.entries(value)) {
          if (v == null) continue;

          const coords = decodeIndex(Number(flatKey), size);
          const geoIdx = coords[id.indexOf("geo")];
          const timeIdx = coords[id.indexOf("time")];

          const geoCode = Object.keys(geoIndex).find((k) => geoIndex[k] === geoIdx);
          const timeCode = Object.keys(timeIndex).find((k) => timeIndex[k] === timeIdx);

          if (geoCode && timeCode) {
            const newPeriod = timeLabels[timeCode];
            const current = byCountry[geoCode];
            if (!current || new Date(newPeriod) > new Date(current.period as string)) {
              byCountry[geoCode] = { period: newPeriod, value: v as number }; // % per annum
            }
          }
        }

        // console.log("[EUROSTAT] ✅ Parsed long-term rates:", byCountry);
        setData(byCountry);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e.message || "Long-term rates fetch failed");
      } finally {
        setIsLoading(false);
      }
    })();

    return () => ac.abort();
  }, [countries, startPeriod]);

  return { data, isLoading, error };
}




/* ------------------------------
 * GDP per capita (computed: totals / population)
 * ------------------------------ */
export function useECBGdpPerCapitaComputed(
  totals: ByCountryMillion | null | undefined,
  populationByCountry?: Record<string, number>
) {
  const data: ByCountryValue | null = useMemo(() => {
    if (!totals) return null;
    const out: ByCountryValue = {};
    for (const [ref, v] of Object.entries(totals)) {
      const pop = populationByCountry?.[ref];
      const totalEur = (v.valueMillion ?? 0) * 1_000_000;
      const perCap = pop && pop > 0 ? totalEur / pop : null;
      out[ref] = { period: v.period, value: perCap };
    }
    // console.log("[ECB] 👤 Computed GDP per capita (EUR/person):", out);
    return out;
  }, [totals, populationByCountry]);

  return { data, isLoading: !totals, error: null as string | null };
}

/* ------------------------------
 * Helpers
 * ------------------------------ */
function latestByCountryMillion(json: any): ByCountryMillion | null {
  try {
    const ds = json?.dataSets?.[0];
    const seriesObj = ds?.series ?? {};
    const seriesKeys = Object.keys(seriesObj);
    if (!seriesKeys.length) return null;

    const serDims = json?.structure?.dimensions?.series ?? [];
    const refAreaDim = serDims.find((d: any) => d.id === "REF_AREA");
    const refAreaVals = refAreaDim?.values ?? [];

    const obsDims = json?.structure?.dimensions?.observation ?? [];
    const timeVals = obsDims.find((d: any) => d.id === "TIME_PERIOD")?.values ?? [];

    const out: ByCountryMillion = {};

    for (const key of seriesKeys) {
      const parts = key.split(":").map(Number);
      const refAreaIdx = serDims.findIndex((d: any) => d.id === "REF_AREA");
      const refAreaCode = refAreaVals[parts[refAreaIdx]]?.id ?? `REF_${parts[refAreaIdx]}`;

      const obs = seriesObj[key]?.observations;
      if (!obs) continue;

      const idx = Object.keys(obs).map(Number).sort((a, b) => a - b);
      const last = idx.at(-1);
      if (last === undefined) continue;

      const val = Number(obs[last]?.[0]);
      const period = timeVals[last]?.id ?? last;

      out[refAreaCode] = {
        period,
        valueMillion: Number.isFinite(val) ? val : null, // million EUR
      };
    }
    return out;
  } catch {
    return null;
  }
}

function latestByCountryValue(json: any): ByCountryValue | null {
  try {
    const ds = json?.dataSets?.[0];
    const seriesObj = ds?.series ?? {};
    const seriesKeys = Object.keys(seriesObj);
    if (!seriesKeys.length) return null;

    const serDims = json?.structure?.dimensions?.series ?? [];
    const refAreaDim = serDims.find((d: any) => d.id === "REF_AREA");
    const refAreaVals = refAreaDim?.values ?? [];

    const obsDims = json?.structure?.dimensions?.observation ?? [];
    const timeVals = obsDims.find((d: any) => d.id === "TIME_PERIOD")?.values ?? [];

    const out: ByCountryValue = {};

    for (const key of seriesKeys) {
      const parts = key.split(":").map(Number);
      const refAreaIdx = serDims.findIndex((d: any) => d.id === "REF_AREA");
      const refAreaCode = refAreaVals[parts[refAreaIdx]]?.id ?? `REF_${parts[refAreaIdx]}`;

      const obs = seriesObj[key]?.observations;
      if (!obs) continue;

      const idx = Object.keys(obs).map(Number).sort((a, b) => a - b);
      const last = idx.at(-1);
      if (last === undefined) continue;

      const val = Number(obs[last]?.[0]); // % value (rate or y/y)
      const period = timeVals[last]?.id ?? last;

      out[refAreaCode] = {
        period,
        value: Number.isFinite(val) ? val : null,
      };
    }
    return out;
  } catch {
    return null;
  }
}

export type { ByCountryMillion, ByCountryValue };
