import { expect, test } from "@playwright/test";
import { apiClient, resetServerState } from "./helpers";

test.describe("trade bar", () => {
  test.beforeEach(async ({ baseURL }) => {
    const api = await apiClient(baseURL!);
    await resetServerState(api);
    await api.dispose();
  });

  test("buys 5 AAPL then sells 5 AAPL — cash and position move as expected", async ({ page, baseURL }) => {
    // Capture the starting cash via the backend to avoid racing the UI poller.
    const api = await apiClient(baseURL!);
    const before = await (await api.get("/api/portfolio")).json();
    const startCash: number = before.cash_balance;
    expect(startCash).toBeCloseTo(10_000, 2);
    await api.dispose();

    await page.goto("/");

    // Wait for the UI to be hydrated enough that the cash Stat has rendered.
    const cashStat = page.locator("span", { hasText: /^Cash$/ }).locator("..");
    await expect(cashStat).toContainText("$10,000.00", { timeout: 15_000 });

    // 1. BUY 5 AAPL via the trade bar.
    await page.getByLabel("Trade ticker").fill("AAPL");
    await page.getByLabel("Trade quantity").fill("5");
    await page.getByTestId("trade-buy").click();

    // Position row appears.
    await expect(page.getByTestId("position-row-AAPL")).toBeVisible({
      timeout: 10_000,
    });

    // Cash decreases below the starting 10k. Portfolio total ~= cash + market_value.
    await expect(cashStat).not.toContainText("$10,000.00", { timeout: 10_000 });

    // Verify via the API that totals are consistent (cash + position_value ~= start).
    const api2 = await apiClient(baseURL!);
    const afterBuy = await (await api2.get("/api/portfolio")).json();
    const aaplPos = afterBuy.positions.find((p: { ticker: string }) => p.ticker === "AAPL");
    expect(aaplPos).toBeDefined();
    expect(aaplPos.quantity).toBeCloseTo(5, 4);
    // Total value should be close to the starting 10k — prices wiggle so allow a
    // generous band. The goal is to catch gross accounting errors, not drift.
    expect(afterBuy.total_value).toBeGreaterThan(startCash - 100);
    expect(afterBuy.total_value).toBeLessThan(startCash + 100);
    await api2.dispose();

    // 2. SELL 5 AAPL — position disappears.
    await page.getByLabel("Trade ticker").fill("AAPL");
    await page.getByLabel("Trade quantity").fill("5");
    await page.getByTestId("trade-sell").click();

    await expect(page.getByTestId("position-row-AAPL")).toHaveCount(0, {
      timeout: 10_000,
    });

    // Cash should have returned (approximately) to the starting value.
    const api3 = await apiClient(baseURL!);
    const afterSell = await (await api3.get("/api/portfolio")).json();
    expect(afterSell.cash_balance).toBeGreaterThan(startCash - 100);
    expect(afterSell.cash_balance).toBeLessThan(startCash + 100);
    expect(afterSell.positions.find((p: { ticker: string }) => p.ticker === "AAPL")).toBeUndefined();
    await api3.dispose();
  });
});
