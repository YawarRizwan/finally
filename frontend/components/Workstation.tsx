"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { priceStore } from "@/lib/priceStore";
import { useSSE } from "@/hooks/useSSE";
import { usePolling } from "@/hooks/usePolling";
import type {
  ChatMessage,
  Portfolio,
  PortfolioSnapshot,
  TradeRequest,
  WatchlistEntry,
} from "@/lib/types";
import { Header } from "./Header";
import { Watchlist } from "./Watchlist";
import { MainChart } from "./MainChart";
import { PortfolioHeatmap } from "./PortfolioHeatmap";
import { PLChart } from "./PLChart";
import { PositionsTable } from "./PositionsTable";
import { TradeBar } from "./TradeBar";
import { ChatPanel } from "./ChatPanel";

const DEFAULT_TICKER = "AAPL";

export function Workstation() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("ticker") || DEFAULT_TICKER;

  const connection = useSSE(true);

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const refreshWatchlist = useCallback(async () => {
    try {
      const entries = await api.getWatchlist();
      setWatchlist(entries);
      priceStore.hydrateFromWatchlist(entries);
      setWatchlistError(null);
    } catch (e) {
      setWatchlistError(e instanceof Error ? e.message : "Watchlist load failed");
    }
  }, []);

  useEffect(() => {
    // Initial fetch. State updates happen after the async fetch resolves,
    // which is the recommended pattern even though the lint rule flags
    // the synchronous call site.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshWatchlist();
  }, [refreshWatchlist]);

  const portfolio = usePolling<Portfolio>(api.getPortfolio, 5000);
  const history = usePolling<PortfolioSnapshot[]>(api.getPortfolioHistory, 30000);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(true);
  const [chatReplying, setChatReplying] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getChatHistory()
      .then((ms) => {
        if (!cancelled) setChatMessages(ms);
      })
      .catch(() => {
        if (!cancelled) setChatMessages([]);
      })
      .finally(() => {
        if (!cancelled) setChatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = useCallback(
    (ticker: string) => {
      const url = `/?ticker=${encodeURIComponent(ticker)}`;
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const handleAdd = useCallback(
    async (ticker: string) => {
      const entry = await api.addWatchlist(ticker);
      priceStore.ensure(ticker);
      await refreshWatchlist();
      return entry;
    },
    [refreshWatchlist],
  );

  const handleRemove = useCallback(
    async (ticker: string) => {
      await api.removeWatchlist(ticker);
      priceStore.remove(ticker);
      await refreshWatchlist();
    },
    [refreshWatchlist],
  );

  const handleTrade = useCallback(
    async (req: TradeRequest) => {
      const result = await api.tradePortfolio(req);
      await portfolio.refetch();
      history.refetch();
      return result;
    },
    [portfolio, history],
  );

  const handleChatSend = useCallback(
    async (text: string) => {
      const nowIso = new Date().toISOString();
      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: text,
        actions: null,
        created_at: nowIso,
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setChatReplying(true);
      try {
        const res = await api.sendChat(text);
        const actions =
          (res.trades && res.trades.length > 0) ||
          (res.watchlist_changes && res.watchlist_changes.length > 0)
            ? {
                trades: res.trades ?? [],
                watchlist_changes: res.watchlist_changes ?? [],
              }
            : null;
        const assistantMsg: ChatMessage = {
          id: `local-${Date.now() + 1}`,
          role: "assistant",
          content: res.message,
          actions,
          created_at: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
        // Some actions may have changed portfolio or watchlist; refresh.
        if (res.trades && res.trades.some((t) => t.status === "executed")) {
          portfolio.refetch();
          history.refetch();
        }
        if (
          res.watchlist_changes &&
          res.watchlist_changes.some((w) => w.status === "executed")
        ) {
          refreshWatchlist();
        }
      } finally {
        setChatReplying(false);
      }
    },
    [portfolio, history, refreshWatchlist],
  );

  const tickers = useMemo(() => watchlist.map((w) => w.ticker), [watchlist]);
  const selectedTicker = useMemo(() => {
    if (tickers.length === 0) return null;
    return tickers.includes(selected) ? selected : tickers[0];
  }, [tickers, selected]);

  return (
    <main className="flex min-h-screen flex-col">
      <Header portfolio={portfolio.data} status={connection} />
      {watchlistError ? (
        <div className="border-b border-border-subtle bg-down/10 px-4 py-1 text-[11px] text-down">
          {watchlistError}
        </div>
      ) : null}
      <div className="grid flex-1 min-h-0 grid-cols-12 gap-2 p-2">
        <div className="col-span-12 md:col-span-3 flex min-h-0 flex-col">
          <Watchlist
            tickers={tickers}
            selected={selectedTicker}
            onSelect={handleSelect}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        </div>
        <div className="col-span-12 md:col-span-6 flex min-h-0 flex-col gap-2">
          <MainChart ticker={selectedTicker} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            <PortfolioHeatmap
              positions={portfolio.data?.positions ?? []}
              onSelect={handleSelect}
            />
            <PLChart snapshots={history.data ?? []} />
          </div>
          <PositionsTable
            positions={portfolio.data?.positions ?? []}
            onSelect={handleSelect}
          />
          <TradeBar defaultTicker={selectedTicker ?? ""} onSubmit={handleTrade} />
        </div>
        <div className="col-span-12 md:col-span-3 flex min-h-0 flex-col">
          <ChatPanel
            messages={chatMessages}
            loading={chatLoading || chatReplying}
            onSend={handleChatSend}
          />
        </div>
      </div>
    </main>
  );
}
