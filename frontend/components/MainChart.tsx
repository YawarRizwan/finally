"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  AreaSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import { Panel } from "./Panel";
import { PriceCell } from "./PriceCell";
import { useTicker } from "@/hooks/useTicker";
import { computeDailyChangePct } from "@/lib/priceStore";
import { fmtPct } from "@/lib/format";

type Props = {
  ticker: string | null;
};

export function MainChart({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const state = useTicker(ticker);

  // Create the chart once per mount; re-used across ticker switches.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#8b949e",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      },
      grid: {
        vertLines: { color: "rgba(42, 45, 69, 0.6)" },
        horzLines: { color: "rgba(42, 45, 69, 0.6)" },
      },
      rightPriceScale: { borderColor: "#2a2d45" },
      timeScale: { borderColor: "#2a2d45", timeVisible: true, secondsVisible: true },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    chartRef.current = chart;
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#209dd7",
      topColor: "rgba(32, 157, 215, 0.35)",
      bottomColor: "rgba(32, 157, 215, 0.0)",
      lineWidth: 2,
      priceLineVisible: true,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Push the ticker's history into the chart whenever it changes.
  useEffect(() => {
    if (!seriesRef.current) return;
    const history = state?.history ?? [];
    if (history.length === 0) {
      seriesRef.current.setData([]);
      return;
    }
    seriesRef.current.setData(
      history.map((p) => ({ time: p.time as UTCTimestamp, value: p.price })),
    );
    chartRef.current?.timeScale().fitContent();
  }, [state?.history, ticker]);

  const pct = computeDailyChangePct(state?.current ?? null, state?.open ?? null);
  const pctClass =
    pct == null ? "text-text-muted" : pct >= 0 ? "text-up" : "text-down";

  return (
    <Panel
      title={ticker ? `${ticker} — Session` : "Main Chart"}
      rightSlot={
        <div className="flex items-center gap-3 text-xs">
          <PriceCell price={state?.current ?? null} direction={state?.direction ?? null} />
          <span className={`font-mono tabular-nums ${pctClass}`}>{fmtPct(pct)}</span>
        </div>
      }
      className="flex-1"
      bodyClassName="relative"
    >
      <div ref={containerRef} className="absolute inset-0" />
      {(state?.history.length ?? 0) < 2 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-widest text-text-muted">
          Accumulating data from live stream...
        </div>
      ) : null}
    </Panel>
  );
}
