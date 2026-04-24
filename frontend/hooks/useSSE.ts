"use client";

import { useEffect, useRef, useState } from "react";
import { priceStore } from "@/lib/priceStore";
import type { ConnectionStatus, PriceEvent } from "@/lib/types";

/**
 * Subscribes to /api/stream/prices via EventSource and feeds the price store.
 * Returns the current connection status for the header indicator.
 */
export function useSSE(enabled: boolean = true): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    let closed = false;
    const open = () => {
      if (closed) return;
      setStatus("reconnecting");
      const es = new EventSource("/api/stream/prices");
      esRef.current = es;

      es.onopen = () => {
        if (!closed) setStatus("connected");
      };

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as PriceEvent;
          if (data && typeof data.ticker === "string" && typeof data.price === "number") {
            priceStore.applyEvent(data);
          }
        } catch {
          // Ignore malformed frames. The backend is the source of truth.
        }
      };

      es.onerror = () => {
        if (closed) return;
        setStatus((prev) => (prev === "connected" ? "reconnecting" : "disconnected"));
        // EventSource reconnects automatically on transient errors. If the
        // connection is closed permanently, fall back to a manual retry.
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          esRef.current = null;
          setTimeout(() => {
            if (!closed) open();
          }, 2000);
        }
      };
    };

    open();

    return () => {
      closed = true;
      esRef.current?.close();
      esRef.current = null;
      setStatus("disconnected");
    };
  }, [enabled]);

  return status;
}
