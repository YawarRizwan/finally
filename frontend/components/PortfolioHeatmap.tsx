"use client";

import { useMemo } from "react";
import { Panel } from "./Panel";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { Position } from "@/lib/types";

type Props = {
  positions: Position[];
  onSelect: (ticker: string) => void;
};

type Rect = {
  position: Position;
  x: number;
  y: number;
  w: number;
  h: number;
};

const WIDTH = 600;
const HEIGHT = 280;

export function PortfolioHeatmap({ positions, onSelect }: Props) {
  const rects = useMemo(() => squarify(positions, WIDTH, HEIGHT), [positions]);

  return (
    <Panel title="Portfolio Heatmap" rightSlot={<span className="text-[10px] text-text-muted">{positions.length} positions</span>}>
      <div className="relative p-2 h-full overflow-hidden">
        {positions.length === 0 ? (
          <div className="flex h-full min-h-[60px] items-center justify-center text-xs text-text-muted">
            No positions yet. Buy something to see the heatmap.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block w-full h-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Portfolio heatmap"
          >
            {rects.map((r) => (
              <HeatmapTile
                key={r.position.ticker}
                rect={r}
                onSelect={() => onSelect(r.position.ticker)}
              />
            ))}
          </svg>
        )}
      </div>
    </Panel>
  );
}

function HeatmapTile({ rect, onSelect }: { rect: Rect; onSelect: () => void }) {
  const { position, x, y, w, h } = rect;
  const pct = position.unrealized_pl_pct;
  const fill = plToColor(pct);
  const showLabel = w > 60 && h > 32;
  const showSub = w > 80 && h > 54;
  return (
    <g
      className="cursor-pointer"
      onClick={onSelect}
      data-testid={`heatmap-tile-${position.ticker}`}
    >
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, w - 2)}
        height={Math.max(0, h - 2)}
        fill={fill}
        stroke="#0d1117"
        strokeWidth={1}
        rx={2}
      />
      {showLabel ? (
        <text
          x={x + w / 2}
          y={y + h / 2 - (showSub ? 6 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontFamily="ui-monospace, monospace"
          fontWeight={700}
          fontSize={Math.min(18, Math.max(10, w / 8))}
        >
          {position.ticker}
        </text>
      ) : null}
      {showSub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.85)"
          fontFamily="ui-monospace, monospace"
          fontSize={11}
        >
          {fmtPct(pct)}
        </text>
      ) : null}
      <title>
        {position.ticker} — {fmtMoney(position.market_value)} · {fmtPct(pct)} · P/L {fmtMoney(position.unrealized_pl)}
      </title>
    </g>
  );
}

function plToColor(pct: number): string {
  // Clamp magnitude to 10% for full saturation.
  const m = Math.min(Math.abs(pct) / 10, 1);
  if (pct >= 0) {
    // green ramp
    const g = Math.round(80 + 130 * m);
    return `rgb(18, ${g}, 54)`;
  }
  const r = Math.round(120 + 130 * m);
  return `rgb(${r}, 42, 52)`;
}

/**
 * Squarified treemap. Inputs are positions; rectangles are sized by
 * market_value (weight). Standard algorithm; no external dependency.
 */
function squarify(positions: Position[], width: number, height: number): Rect[] {
  if (positions.length === 0) return [];
  const total = positions.reduce((s, p) => s + Math.max(p.market_value, 0), 0);
  if (total <= 0) return [];
  const items = positions
    .filter((p) => p.market_value > 0)
    .map((p) => ({ position: p, area: (p.market_value / total) * width * height }))
    .sort((a, b) => b.area - a.area);

  const out: Rect[] = [];
  layoutRow(items, { x: 0, y: 0, w: width, h: height }, out);
  return out;
}

type Item = { position: Position; area: number };
type Box = { x: number; y: number; w: number; h: number };

function layoutRow(items: Item[], box: Box, out: Rect[]): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    out.push({ position: items[0].position, ...box });
    return;
  }
  const shortest = Math.min(box.w, box.h);
  let row: Item[] = [];
  let best = Infinity;
  let i = 0;
  while (i < items.length) {
    const candidate = [...row, items[i]];
    const ratio = worstAspect(candidate, shortest);
    if (ratio <= best) {
      row = candidate;
      best = ratio;
      i += 1;
    } else {
      break;
    }
  }
  const rowArea = row.reduce((s, it) => s + it.area, 0);
  const rowLen = rowArea / shortest;
  if (box.w >= box.h) {
    // lay out row as a column on the left
    let cy = box.y;
    for (const it of row) {
      const h = it.area / rowLen;
      out.push({ position: it.position, x: box.x, y: cy, w: rowLen, h });
      cy += h;
    }
    const rest: Box = { x: box.x + rowLen, y: box.y, w: box.w - rowLen, h: box.h };
    layoutRow(items.slice(row.length), rest, out);
  } else {
    // lay out row as a row on the top
    let cx = box.x;
    for (const it of row) {
      const w = it.area / rowLen;
      out.push({ position: it.position, x: cx, y: box.y, w, h: rowLen });
      cx += w;
    }
    const rest: Box = { x: box.x, y: box.y + rowLen, w: box.w, h: box.h - rowLen };
    layoutRow(items.slice(row.length), rest, out);
  }
}

function worstAspect(row: Item[], side: number): number {
  const sum = row.reduce((s, it) => s + it.area, 0);
  const max = Math.max(...row.map((it) => it.area));
  const min = Math.min(...row.map((it) => it.area));
  const sq = side * side;
  return Math.max((sq * max) / (sum * sum), (sum * sum) / (sq * min));
}
