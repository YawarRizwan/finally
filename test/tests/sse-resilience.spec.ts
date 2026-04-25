import { expect, test } from "@playwright/test";

test.describe("SSE resilience", () => {
  // Reconnect is the one scenario where a single retry is reasonable.
  test.describe.configure({ retries: 1 });

  test("the connection dot recovers to connected after a forced network blip", async ({ page, context }) => {
    await page.goto("/");

    // 1. Wait for initial connection to succeed.
    await expect(page.getByTestId("connection-status")).toHaveAttribute(
      "data-status",
      "connected",
      { timeout: 15_000 },
    );

    // 2. Block future SSE requests so the reconnect attempt fails temporarily.
    await context.route("**/api/stream/prices", (route) => route.abort());

    // 3. Force-close the current EventSource via the test hook exposed by
    //    useSSE. This triggers the onerror handler reliably regardless of
    //    Docker bridge networking (CDP offline doesn't work there).
    await page.evaluate(() => {
      const fn = (
        window as typeof window & { __finallySSEClose?: () => void }
      ).__finallySSEClose;
      if (fn) fn();
    });

    // 4. The dot should leave "connected" quickly after the forced close.
    await expect(page.getByTestId("connection-status")).not.toHaveAttribute(
      "data-status",
      "connected",
      { timeout: 10_000 },
    );

    // 5. Restore the SSE endpoint so the built-in retry can reconnect.
    await context.unroute("**/api/stream/prices");

    // 6. Dot returns to "connected" once the retry opens a fresh EventSource.
    await expect(page.getByTestId("connection-status")).toHaveAttribute(
      "data-status",
      "connected",
      { timeout: 20_000 },
    );
  });
});
