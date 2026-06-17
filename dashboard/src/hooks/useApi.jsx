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

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`rounded-xl border border-oai-gray-200 dark:border-oai-gray-800 bg-white dark:bg-oai-gray-900 p-5 ${className}`}>
      <div className="skeleton h-5 w-1/3 mb-4" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-2/3 mb-2" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

export function SkeletonMetric({ className = "" }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="skeleton h-16 w-24 mx-auto mb-2" />
      <div className="skeleton h-3 w-16 mx-auto" />
    </div>
  );
}
