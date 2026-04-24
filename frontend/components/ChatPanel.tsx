"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "./Panel";
import { fmtMoney, fmtPrice, fmtQty } from "@/lib/format";
import type {
  ChatMessage,
  TradeAction,
  WatchlistChangeAction,
} from "@/lib/types";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => Promise<void>;
};

export function ChatPanel({ messages, loading, onSend }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(body);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Panel
      title="AI Assistant"
      rightSlot={
        <span className="text-[10px] text-text-muted">
          {loading ? "Loading history..." : `${messages.length} messages`}
        </span>
      }
      className="flex-1"
    >
      <div ref={listRef} className="h-full overflow-y-auto scroll-thin p-3" data-testid="chat-list">
        {messages.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {loading ? <LoadingBubble /> : null}
          </ul>
        )}
      </div>
      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-border-subtle bg-bg-panel-raised p-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask FinAlly to analyze or trade..."
          disabled={sending}
          aria-label="Chat message"
          className="flex-1 rounded-sm border border-border-subtle bg-bg-deep px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          data-testid="chat-send"
          className="rounded-sm border border-submit bg-submit px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-submit/80 disabled:opacity-40"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
      {error ? (
        <div className="border-t border-border-subtle bg-down/10 px-3 py-1 text-[11px] text-down">
          {error}
        </div>
      ) : null}
    </Panel>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 text-center text-xs text-text-muted">
      <p className="mb-2 font-semibold uppercase tracking-[0.2em]">FinAlly is ready</p>
      <p>Try: &quot;What is my portfolio risk?&quot; or &quot;Buy 10 AAPL&quot;.</p>
    </div>
  );
}

function LoadingBubble() {
  return (
    <li className="flex justify-start" data-testid="chat-loading">
      <div className="max-w-[85%] rounded-sm border border-border-subtle bg-bg-panel-raised px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
            style={{ animationDelay: "300ms" }}
          />
          <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Thinking...
          </span>
        </div>
      </div>
    </li>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <li
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`chat-message-${message.role}`}
    >
      <div
        className={`max-w-[85%] rounded-sm border px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "border-primary/40 bg-primary/10 text-text-primary"
            : "border-border-subtle bg-bg-panel-raised text-text-primary"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.actions ? <ActionChips actions={message.actions} /> : null}
      </div>
    </li>
  );
}

function ActionChips({
  actions,
}: {
  actions: NonNullable<ChatMessage["actions"]>;
}) {
  const trades = actions.trades ?? [];
  const watchlist = actions.watchlist_changes ?? [];
  if (trades.length === 0 && watchlist.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {trades.map((t, i) => (
        <TradeChip key={`t-${i}`} trade={t} />
      ))}
      {watchlist.map((w, i) => (
        <WatchlistChip key={`w-${i}`} change={w} />
      ))}
    </div>
  );
}

function TradeChip({ trade }: { trade: TradeAction }) {
  const executed = trade.status === "executed";
  const cls = executed
    ? "border-up/40 bg-up/10 text-up"
    : "border-down/40 bg-down/10 text-down";
  return (
    <div
      className={`rounded-sm border px-2 py-1 font-mono text-[11px] ${cls}`}
      data-testid={`trade-chip-${trade.status}`}
    >
      <span className="font-semibold uppercase">
        {trade.side} {fmtQty(trade.quantity)} {trade.ticker}
      </span>
      {executed ? (
        <span className="ml-2 text-text-muted">
          @ {fmtPrice(trade.price)} · {fmtMoney(trade.notional)}
        </span>
      ) : (
        <span className="ml-2 text-text-muted">
          rejected: {trade.error ?? "unknown"}
        </span>
      )}
    </div>
  );
}

function WatchlistChip({ change }: { change: WatchlistChangeAction }) {
  const executed = change.status === "executed";
  const cls = executed
    ? "border-primary/40 bg-primary/10 text-primary"
    : "border-down/40 bg-down/10 text-down";
  return (
    <div
      className={`rounded-sm border px-2 py-1 font-mono text-[11px] ${cls}`}
      data-testid={`watchlist-chip-${change.status}`}
    >
      <span className="font-semibold uppercase">
        Watchlist {change.action} {change.ticker}
      </span>
      {executed ? null : (
        <span className="ml-2 text-text-muted">
          rejected: {change.error ?? "unknown"}
        </span>
      )}
    </div>
  );
}
