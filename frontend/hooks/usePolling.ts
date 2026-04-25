"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type PollingResult<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const run = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);

  return { data, error, loading, refetch: run };
}
