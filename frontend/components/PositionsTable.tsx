"use client";

import { Panel } from "./Panel";
import { fmtMoney, fmtPct, fmtPrice, fmtQty } from "@/lib/format";
import type { Position } from "@/lib/types";

type Props = {
  positions: Position[];
  onSelect: (ticker: string) => void;
};

export function PositionsTable({ positions, onSelect }: Props) {
  return (
    <Panel title="Positions" rightSlot={<span className="text-[10px] text-text-muted">{positions.length} rows</span>}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-panel-raised text-text-muted">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium uppercase tracking-wider">Symbol</th>
              <th className="px-3 py-2 text-right font-medium uppercase tracking-wider">Qty</th>
              <th className="px-3 py-2 text-right font-medium uppercase tracking-wider">Avg Cost</th>
              <th className="px-3 py-2 text-right font-medium uppercase tracking-wider">Last</th>
              <th className="px-3 py-2 text-right font-medium uppercase tracking-wider">Mkt Value</th>
              <th className="px-3 py-2 text-right font-medium uppercase tracking-wider">P/L</th>
              <th className="px-3 py-2 text-right font-medium uppercase tracking-wider">P/L %</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const plClass = p.unrealized_pl >= 0 ? "text-up" : "text-down";
              return (
                <tr
                  key={p.ticker}
                  onClick={() => onSelect(p.ticker)}
                  className="cursor-pointer border-b border-border-subtle hover:bg-bg-panel-raised"
                  data-testid={`position-row-${p.ticker}`}
                >
                  <td className="px-3 py-2 font-mono font-semibold">{p.ticker}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtQty(p.quantity)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtPrice(p.avg_cost)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtPrice(p.current_price)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtMoney(p.market_value)}</td>
                  <td className={`px-3 py-2 text-right font-mono tabular-nums ${plClass}`}>
                    {fmtMoney(p.unrealized_pl)}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono tabular-nums ${plClass}`}>
                    {fmtPct(p.unrealized_pl_pct)}
                  </td>
                </tr>
              );
            })}
            {positions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-text-muted">
                  No positions. Enter a trade below.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
