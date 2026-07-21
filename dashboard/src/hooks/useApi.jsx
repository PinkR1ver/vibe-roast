import { useEffect, useState } from "react";

export function useApi(range = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (range.from) params.set("from", range.from);
        if (range.to) params.set("to", range.to);
        const qs = params.toString();
        const res = await fetch(`/api/inspect${qs ? `?${qs}` : ""}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  return { data, loading, error };
}
