import { expect, test } from "@playwright/test";
import { DEFAULT_TICKERS, apiClient, resetServerState } from "./helpers";

test.describe("fresh start", () => {
  test.beforeEach(async ({ baseURL }) => {
    const api = await apiClient(baseURL!);
    await resetServerState(api);
    await api.dispose();
  });

  test("renders 10 default tickers, $10k cash, green status dot, and streaming prices", async ({ page, baseURL }) => {
    await page.goto("/");

    // 1. All 10 default tickers appear in the watchlist.
    for (const ticker of DEFAULT_TICKERS) {
      await expect(
        page.getByTestId(`watchlist-row-${ticker}`),
        `watchlist is missing ${ticker}`,
      ).toBeVisible();
    }

    // 2. Cash shows $10,000.00. The header renders three Stat blocks; the
    // "Cash" label is uniquely identifying.
    const cashStat = page.locator("span", { hasText: /^Cash$/ }).locator("..");
    await expect(cashStat).toContainText("$10,000.00", { timeout: 15_000 });

    // 3. Connection dot eventually reports "connected".
    await expect(page.getByTestId("connection-status")).toHaveAttribute(
      "data-status",
      "connected",
      { timeout: 15_000 },
    );

    // 4. Prices are streaming: observe at least one SSE event on the client.
    // We attach a native EventSource listener and count frames for ~5s.
    const eventCount = await page.evaluate(async (base) => {
      return await new Promise<number>((resolve) => {
        const url = new URL("/api/stream/prices", base ?? window.location.origin);
        const es = new EventSource(url.toString());
        let count = 0;
        es.onmessage = () => {
          count += 1;
          if (count >= 3) {
            es.close();
            resolve(count);
          }
        };
        setTimeout(() => {
          es.close();
          resolve(count);
        }, 5_000);
      });
    }, baseURL);

    expect(
      eventCount,
      "SSE did not deliver any price frames within 5 seconds",
    ).toBeGreaterThan(0);
  });
});
