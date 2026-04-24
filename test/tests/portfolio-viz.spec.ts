import { expect, test } from "@playwright/test";
import { apiClient, resetServerState } from "./helpers";

test.describe("portfolio visualizations", () => {
  test.beforeEach(async ({ baseURL }) => {
    const api = await apiClient(baseURL!);
    await resetServerState(api);
    await api.dispose();
  });

  test("after a trade the heatmap renders at least one tile and PL chart has data", async ({ page, baseURL }) => {
    // Seed a position via the API so the viz has something to show without
    // depending on the trade UI spec also passing.
    const api = await apiClient(baseURL!);
    const tradeRes = await api.post("/api/portfolio/trade", {
      data: { ticker: "AAPL", quantity: 3, side: "buy" },
    });
    expect(tradeRes.ok(), "seed trade failed").toBeTruthy();
    await api.dispose();

    await page.goto("/");

    // 1. Heatmap renders at least one tile.
    await expect(page.getByTestId("heatmap-tile-AAPL")).toBeVisible({ timeout: 15_000 });

    // 2. P&L chart container exists and eventually has data. Lightweight Charts
    //    renders into a canvas — we assert at the API level that snapshots exist
    //    (the chart component just reflects that data).
    const api2 = await apiClient(baseURL!);
    await expect
      .poll(
        async () => {
          const r = await api2.get("/api/portfolio/history");
          if (!r.ok()) return 0;
          const snaps = (await r.json()) as unknown[];
          return snaps.length;
        },
        {
          message: "portfolio_snapshots never received any data points",
          timeout: 20_000,
          intervals: [500, 1000, 2000],
        },
      )
      .toBeGreaterThan(0);
    await api2.dispose();

    // Confirm the chart panel is in the DOM.
    await expect(page.locator("text=Portfolio Value").first()).toBeVisible();
  });
});
