"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "./Panel";
import type { TradeRequest, TradeSide } from "@/lib/types";

type Props = {
  defaultTicker?: string;
  onSubmit: (req: TradeRequest) => Promise<unknown>;
};

export function TradeBar({ defaultTicker = "", onSubmit }: Props) {
  const [ticker, setTicker] = useState(defaultTicker);
  const [quantity, setQuantity] = useState<string>("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const userEditedRef = useRef(false);

  // When the selected ticker changes upstream, follow it unless the user has
  // manually typed something else into the ticker field.
  useEffect(() => {
    if (!userEditedRef.current && defaultTicker) {
      setTicker(defaultTicker);
    }
  }, [defaultTicker]);

  async function submit(side: TradeSide) {
    const t = ticker.trim().toUpperCase();
    const q = parseFloat(quantity);
    if (!t) {
      setError("Ticker required");
      return;
    }
    if (!Number.isFinite(q) || q <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    setBusy(true);
    setError(null);
    setLastMsg(null);
    try {
      await onSubmit({ ticker: t, quantity: q, side });
      setLastMsg(`${side.toUpperCase()} ${q} ${t} submitted`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Trade" className="shrink-0">
      <div className="flex flex-wrap items-end gap-3 p-3">
        <Field label="Ticker">
          <input
            value={ticker}
            onChange={(e) => {
              userEditedRef.current = true;
              setTicker(e.target.value.toUpperCase());
            }}
            placeholder="AAPL"
            disabled={busy}
            aria-label="Trade ticker"
            className="w-28 rounded-sm border border-border-subtle bg-bg-deep px-2 py-1.5 font-mono text-sm uppercase outline-none focus:border-primary"
          />
        </Field>
        <Field label="Quantity">
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            step="any"
            min="0"
            disabled={busy}
            aria-label="Trade quantity"
            className="w-28 rounded-sm border border-border-subtle bg-bg-deep px-2 py-1.5 font-mono text-sm tabular-nums outline-none focus:border-primary"
          />
        </Field>
        <div className="flex gap-2">
          <button
            onClick={() => submit("buy")}
            disabled={busy}
            data-testid="trade-buy"
            className="rounded-sm border border-submit bg-submit px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-submit/80 disabled:opacity-40"
          >
            Buy
          </button>
          <button
            onClick={() => submit("sell")}
            disabled={busy}
            data-testid="trade-sell"
            className="rounded-sm border border-submit bg-submit px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-submit/80 disabled:opacity-40"
          >
            Sell
          </button>
        </div>
        <div className="ml-auto text-[11px]">
          {error ? <span className="text-down">{error}</span> : null}
          {lastMsg ? <span className="text-up">{lastMsg}</span> : null}
          <span className="ml-2 text-text-muted">Market order, instant fill.</span>
        </div>
      </div>
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{label}</span>
      {children}
    </label>
  );
}
