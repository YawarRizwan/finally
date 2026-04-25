"use client";

import { useEffect, useRef } from "react";
import type { PricePoint } from "@/lib/types";

type Props = {
  points: PricePoint[];
  direction: "up" | "down" | "flat" | null;
  width?: number;
  height?: number;
};

const COLOR_UP = "#3fb950";
const COLOR_DOWN = "#f85149";
const COLOR_FLAT = "#8b949e";

/**
 * A lightweight inline SVG sparkline. Avoids spinning up a Lightweight Charts
 * instance per watchlist row (expensive at 10+ rows).
 */
export function Sparkline({ points, direction, width = 120, height = 32 }: Props) {
  const ref = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (!ref.current || points.length < 2) return;
    const path = buildPath(points, width, height);
    ref.current.setAttribute("d", path);
  }, [points, width, height]);

  if (points.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={COLOR_FLAT}
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.4"
        />
      </svg>
    );
  }

  const color =
    direction === "up" ? COLOR_UP : direction === "down" ? COLOR_DOWN : COLOR_FLAT;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      preserveAspectRatio="none"
    >
      <path
        ref={ref}
        d={buildPath(points, width, height)}
        fill="none"
        stroke={color}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildPath(points: PricePoint[], w: number, h: number): string {
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const pad = 2;
  const usableH = h - pad * 2;
  return points
    .map((p, i) => {
      const x = i * step;
      const y = pad + usableH - ((p.price - min) / range) * usableH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
