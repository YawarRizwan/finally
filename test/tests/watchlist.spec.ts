import { expect, test } from "@playwright/test";
import { apiClient, resetServerState } from "./helpers";

const EXTRA_TICKER = "PYPL";

test.describe("watchlist", () => {
  test.beforeEach(async ({ baseURL }) => {
    const api = await apiClient(baseURL!);
    await resetServerState(api);
    // Ensure the extra ticker is not present before the test runs.
    await api.delete(`/api/watchlist/${EXTRA_TICKER}`);
    await api.dispose();
  });

  test("user adds and removes a ticker via the watchlist panel", async ({ page }) => {
    await page.goto("/");

    // Sanity: extra ticker not present initially.
    await expect(page.getByTestId(`watchlist-row-${EXTRA_TICKER}`)).toHaveCount(0);

    // Add via the form input.
    const input = page.getByLabel("Add ticker");
    await input.fill(EXTRA_TICKER);
    await page.getByRole("button", { name: /^Add$/ }).click();

    // Row appears.
    await expect(page.getByTestId(`watchlist-row-${EXTRA_TICKER}`)).toBeVisible({
      timeout: 10_000,
    });

    // Remove via the per-row button.
    await page.getByRole("button", { name: `Remove ${EXTRA_TICKER}` }).click();

    // Row disappears.
    await expect(page.getByTestId(`watchlist-row-${EXTRA_TICKER}`)).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
