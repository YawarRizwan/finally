"use client";

import { useMemo, useState } from "react";
import { Panel } from "./Panel";
import { PriceCell } from "./PriceCell";
import { Sparkline } from "./Sparkline";
import { useAllTickers } from "@/hooks/useTicker";
import { computeDailyChangePct } from "@/lib/priceStore";
import { fmtPct } from "@/lib/format";
import type { WatchlistEntry } from "@/lib/types";

type Props = {
  tickers: string[];
  selected: string | null;
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => Promise<WatchlistEntry | void>;
  onRemove: (ticker: string) => Promise<void>;
};

export function Watchlist({ tickers, selected, onSelect, onAdd, onRemove }: Props) {
  const all = useAllTickers();
  const [newTicker, setNewTicker] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () => tickers.map((t) => ({ ticker: t, state: all.get(t) })),
    [tickers, all],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = newTicker.trim().toUpperCase();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(t);
      setNewTicker("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Watchlist" rightSlot={<span className="text-[10px] text-text-muted">{tickers.length} symbols</span>} className="flex-1 min-h-0" bodyClassName="flex flex-col">
      <form onSubmit={handleAdd} className="flex gap-2 border-b border-border-subtle px-3 py-2">
        <input
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          placeholder="Add ticker"
          className="flex-1 rounded-sm border border-border-subtle bg-bg-deep px-2 py-1 font-mono text-xs uppercase outline-none focus:border-primary"
          disabled={busy}
          aria-label="Add ticker"
        />
        <button
          type="submit"
          disabled={busy || !newTicker.trim()}
          className="rounded-sm border border-primary bg-primary/20 px-3 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/30 disabled:opacity-40"
        >
          Add
        </button>
      </form>
      {error ? (
        <div className="border-b border-border-subtle bg-down/10 px-3 py-1 text-[11px] text-down">
          {error}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-panel-raised text-text-muted">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium uppercase tracking-wider">Symbol</th>
              <th className="px-3 py-2 font-medium uppercase tracking-wider">Price</th>
              <th className="px-3 py-2 text-right font-medium uppercase tracking-wider">Chg%</th>
              <th className="px-3 py-2 font-medium uppercase tracking-wider">Chart</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ticker, state }) => {
              const pct = computeDailyChangePct(state?.current ?? null, state?.open ?? null);
              const pctClass =
                pct == null ? "text-text-muted" : pct >= 0 ? "text-up" : "text-down";
              const isSelected = ticker === selected;
              return (
                <tr
                  key={ticker}
                  onClick={() => onSelect(ticker)}
                  className={`cursor-pointer border-b border-border-subtle hover:bg-bg-panel-raised ${
                    isSelected ? "bg-primary/10" : ""
                  }`}
                  data-testid={`watchlist-row-${ticker}`}
                  aria-selected={isSelected}
                >
                  <td className="px-3 py-2 font-mono font-semibold">{ticker}</td>
                  <td className="px-1 py-1">
                    <PriceCell price={state?.current ?? null} direction={state?.direction ?? null} />
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${pctClass}`}>
                    {fmtPct(pct)}
                  </td>
                  <td className="px-3 py-2">
                    <Sparkline points={state?.history ?? []} direction={state?.direction ?? null} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(ticker).catch(() => {});
                      }}
                      aria-label={`Remove ${ticker}`}
                      className="rounded-sm border border-border-subtle px-1.5 text-[10px] text-text-muted hover:border-down hover:text-down"
                    >
                      x
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                  No tickers. Add one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
