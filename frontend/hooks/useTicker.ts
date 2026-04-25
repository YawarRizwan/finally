"use client";

import { useSyncExternalStore } from "react";
import { priceStore } from "@/lib/priceStore";
import type { TickerState } from "@/lib/types";

function getSnapshot(ticker: string) {
  return () => priceStore.get(ticker);
}

export function useTicker(ticker: string | null): TickerState | undefined {
  return useSyncExternalStore(
    priceStore.subscribe,
    ticker ? getSnapshot(ticker) : () => undefined,
    () => undefined,
  );
}

export function useAllTickers(): ReadonlyMap<string, TickerState> {
  return useSyncExternalStore(
    priceStore.subscribe,
    () => {
      // Re-read version to trigger updates; return the map directly.
      priceStore.getVersion();
      return priceStore.getAll();
    },
    () => priceStore.getAll(),
  );
}
