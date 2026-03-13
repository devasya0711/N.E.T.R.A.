import { useState, useEffect, useCallback, useRef } from "react";
import { fetchPotholes, fetchStats, fetchTrends, fetchHighways, mapPothole } from "../services/api";

const POLL_INTERVAL = 30_000; // 30 seconds

// ── Generic fetcher with polling ──────────────────────────────────────────────
function usePolledData(fetcher, defaultValue, pollInterval = POLL_INTERVAL) {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetcher();
      if (mountedRef.current) {
        setData(res.data);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const id = setInterval(load, pollInterval);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [load, pollInterval]);

  return { data, loading, error, refresh: load };
}

// ── Potholes list (with pagination metadata) ──────────────────────────────────
export function usePotholeList(params = {}) {
  const [potholes, setPotholes] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const load = useCallback(async () => {
    try {
      const res = await fetchPotholes(paramsRef.current);
      if (mountedRef.current) {
        setPotholes(res.data.map(mapPothole));
        setPagination(res.pagination);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [load]);

  return { potholes, pagination, loading, error, refresh: load };
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function useStats() {
  return usePolledData(fetchStats, null);
}

// ── Trends ────────────────────────────────────────────────────────────────────
export function useTrends() {
  return usePolledData(fetchTrends, []);
}

// ── Highways ──────────────────────────────────────────────────────────────────
export function useHighways() {
  return usePolledData(fetchHighways, []);
}
