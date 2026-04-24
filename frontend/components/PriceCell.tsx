"use client";

import { useEffect, useRef, useState } from "react";
import { fmtPrice } from "@/lib/format";
import type { Direction } from "@/lib/types";

type Props = {
  price: number | null;
  direction: Direction | null;
  className?: string;
};

/**
 * Displays the current price with a brief green/red background flash whenever
 * the price value changes. The flash class is removed after the animation
 * completes (~500ms) so it can be re-applied on the next tick.
 */
export function PriceCell({ price, direction, className = "" }: Props) {
  const [flashClass, setFlashClass] = useState<"" | "flash-up" | "flash-down">("");
  const prevPriceRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevPriceRef.current;
    if (price != null && prev != null && price !== prev) {
      const cls = price > prev ? "flash-up" : "flash-down";
      setFlashClass(cls);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setFlashClass(""), 500);
    }
    prevPriceRef.current = price;
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [price]);

  const color =
    direction === "up"
      ? "text-up"
      : direction === "down"
        ? "text-down"
        : "text-text-primary";

  return (
    <span
      data-testid="price-cell"
      data-flash={flashClass}
      className={`inline-block rounded-sm px-2 py-0.5 font-mono tabular-nums ${color} ${flashClass} ${className}`}
    >
      {fmtPrice(price)}
    </span>
  );
}
