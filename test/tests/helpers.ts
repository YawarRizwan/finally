import { APIRequestContext, Page, expect, request } from "@playwright/test";

export const DEFAULT_TICKERS = [
  "AAPL",
  "GOOGL",
  "MSFT",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "JPM",
  "V",
  "NFLX",
];

/**
 * Create a backend API client. Falls back to the Playwright baseURL when no
 * explicit base is provided.
 */
export async function apiClient(baseURL: string): Promise<APIRequestContext> {
  return request.newContext({ baseURL });
}

/**
 * Reset server-side state so each test starts from the canonical seed:
 *   - cash = 10_000 (exact)
 *   - watchlist = 10 default tickers
 *   - no positions, no trades, no chat history
 *
 * Uses the /api/debug/reset endpoint (available when LLM_MOCK=true) for an
 * exact hard-reset rather than best-effort liquidation.
 */
export async function resetServerState(api: APIRequestContext): Promise<void> {
  const res = await api.post("/api/debug/reset");
  expect(res.ok(), `debug reset failed: ${res.status()}`).toBeTruthy();
}

/**
 * Wait for an element to have a specific attribute value, with a clear error
 * message on timeout.
 */
export async function waitForStatus(
  page: Page,
  testId: string,
  status: string,
  timeout = 15_000,
): Promise<void> {
  const el = page.getByTestId(testId);
  await expect(el).toHaveAttribute("data-status", status, { timeout });
}
