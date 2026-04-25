import { beforeEach, describe, expect, it } from "vitest";
import { priceStore, computeDailyChangePct } from "@/lib/priceStore";
import type { PriceEvent, WatchlistEntry } from "@/lib/types";

function mkEvent(overrides: Partial<PriceEvent> = {}): PriceEvent {
  return {
    ticker: "AAPL",
    price: 190,
    prev_price: 189,
    timestamp: new Date("2026-04-10T12:00:00.500Z").toISOString(),
    direction: "up",
    ...overrides,
  };
}

describe("priceStore", () => {
  beforeEach(() => {
    priceStore._reset();
  });

  it("applies a single event", () => {
    priceStore.applyEvent(mkEvent());
    const state = priceStore.get("AAPL");
    expect(state?.current).toBe(190);
    expect(state?.prev).toBe(189);
    expect(state?.direction).toBe("up");
    expect(state?.history.length).toBe(1);
  });

  it("appends history in strictly increasing time order", () => {
    priceStore.applyEvent(mkEvent({ price: 100, timestamp: "2026-04-10T12:00:00.000Z" }));
    priceStore.applyEvent(mkEvent({ price: 101, timestamp: "2026-04-10T12:00:01.000Z" }));
    priceStore.applyEvent(mkEvent({ price: 102, timestamp: "2026-04-10T12:00:02.000Z" }));
    const s = priceStore.get("AAPL")!;
    expect(s.history.map((p) => p.price)).toEqual([100, 101, 102]);
    for (let i = 1; i < s.history.length; i++) {
      expect(s.history[i].time).toBeGreaterThan(s.history[i - 1].time);
    }
  });

  it("hydrates open_price from watchlist entries", () => {
    const entries: WatchlistEntry[] = [
      {
        ticker: "AAPL",
        price: 191,
        prev_price: 190,
        open_price: 190,
        direction: "up",
        timestamp: "2026-04-10T12:00:00.500Z",
      },
    ];
    priceStore.hydrateFromWatchlist(entries);
    expect(priceStore.get("AAPL")?.open).toBe(190);
  });

  it("removes a ticker cleanly", () => {
    priceStore.applyEvent(mkEvent());
    priceStore.remove("AAPL");
    expect(priceStore.get("AAPL")).toBeUndefined();
  });

  it("notifies subscribers on each change", () => {
    let calls = 0;
    const unsub = priceStore.subscribe(() => {
      calls += 1;
    });
    priceStore.applyEvent(mkEvent());
    priceStore.applyEvent(mkEvent({ price: 191 }));
    unsub();
    priceStore.applyEvent(mkEvent({ price: 192 }));
    expect(calls).toBe(2);
  });
});

describe("computeDailyChangePct", () => {
  it("returns null for missing inputs", () => {
    expect(computeDailyChangePct(null, 100)).toBeNull();
    expect(computeDailyChangePct(100, null)).toBeNull();
    expect(computeDailyChangePct(100, 0)).toBeNull();
  });

  it("computes positive and negative change correctly", () => {
    expect(computeDailyChangePct(110, 100)).toBeCloseTo(10);
    expect(computeDailyChangePct(90, 100)).toBeCloseTo(-10);
    expect(computeDailyChangePct(100, 100)).toBeCloseTo(0);
  });
});
