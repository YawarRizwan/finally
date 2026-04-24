"use client";

import type { ConnectionStatus, Portfolio } from "@/lib/types";
import { fmtMoney } from "@/lib/format";

type Props = {
  portfolio: Portfolio | null;
  status: ConnectionStatus;
};

const statusLabel: Record<ConnectionStatus, string> = {
  connected: "LIVE",
  reconnecting: "RECONNECT",
  disconnected: "OFFLINE",
};

const statusDot: Record<ConnectionStatus, string> = {
  connected: "bg-up shadow-[0_0_8px_rgba(63,185,80,0.8)]",
  reconnecting: "bg-accent shadow-[0_0_8px_rgba(236,173,10,0.8)] animate-pulse",
  disconnected: "bg-down shadow-[0_0_8px_rgba(248,81,73,0.8)]",
};

export function Header({ portfolio, status }: Props) {
  const totalValue = portfolio?.total_value ?? null;
  const cash = portfolio?.cash_balance ?? null;
  const pl = portfolio?.total_unrealized_pl ?? null;
  const plSign = pl == null ? "text-text-muted" : pl >= 0 ? "text-up" : "text-down";

  return (
    <header className="flex items-center justify-between border-b border-border-subtle bg-bg-panel px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent text-[11px] font-bold tracking-tight text-black">
          FA
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide text-text-primary">
            FinAlly
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Trading Workstation
          </span>
        </div>
      </div>

      <div className="flex items-center gap-8 font-mono text-sm">
        <Stat label="Portfolio" value={fmtMoney(totalValue)} />
        <Stat label="Cash" value={fmtMoney(cash)} />
        <Stat
          label="Unrealized P/L"
          value={fmtMoney(pl)}
          valueClass={plSign}
        />
      </div>

      <div
        className="flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-panel-raised px-3 py-1.5"
        data-testid="connection-status"
        data-status={status}
      >
        <span className={`h-2 w-2 rounded-full ${statusDot[status]}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          {statusLabel[status]}
        </span>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-text-primary",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
