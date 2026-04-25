"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Panel } from "./Panel";
import { fmtMoney } from "@/lib/format";
import type { PortfolioSnapshot } from "@/lib/types";

type Props = {
  snapshots: PortfolioSnapshot[];
  startingValue?: number;
};

export function PLChart({ snapshots, startingValue = 10000 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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
      timeScale: { borderColor: "#2a2d45", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    chartRef.current = chart;
    const series = chart.addSeries(LineSeries, {
      color: "#ecad0a",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    const points = snapshots
      .map((s) => ({
        time: Math.floor(new Date(s.recorded_at).getTime() / 1000) as UTCTimestamp,
        value: s.total_value,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))
      // ensure strictly ascending, merge duplicates by taking the last
      .filter((p, i, arr) => i === 0 || p.time !== arr[i - 1].time);
    seriesRef.current.setData(points);
    chartRef.current?.timeScale().fitContent();
  }, [snapshots]);

  const latest = snapshots.at(-1)?.total_value ?? null;
  const delta = latest != null ? latest - startingValue : null;
  const deltaClass =
    delta == null ? "text-text-muted" : delta >= 0 ? "text-up" : "text-down";

  return (
    <Panel
      title="Portfolio Value"
      rightSlot={
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono tabular-nums text-text-primary">
            {fmtMoney(latest)}
          </span>
          <span className={`font-mono tabular-nums ${deltaClass}`}>
            {delta == null ? "—" : `${delta >= 0 ? "+" : ""}${fmtMoney(delta)}`}
          </span>
        </div>
      }
      bodyClassName="relative"
    >
      <div ref={containerRef} className="h-full min-h-[60px]" />
    </Panel>
  );
}
