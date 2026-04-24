import { expect, test } from "@playwright/test";
import { apiClient, resetServerState } from "./helpers";
import fixture from "../fixtures/llm_mock_response.json";

test.describe("chat (mocked LLM)", () => {
  test.beforeEach(async ({ baseURL }) => {
    const api = await apiClient(baseURL!);
    await resetServerState(api);
    await api.dispose();
  });

  test("sending a message renders the mock assistant reply and an inline trade chip", async ({ page }) => {
    await page.goto("/");

    // Wait for the chat panel to finish loading initial history.
    await expect(page.getByTestId("chat-list")).toBeVisible();

    // Send a message.
    const input = page.getByLabel("Chat message");
    await input.fill("buy some AAPL please");
    await page.getByTestId("chat-send").click();

    // The user message appears (use .first() since prior test runs may leave
    // chat history in the DB — resetServerState has no chat-clear endpoint).
    await expect(
      page.getByTestId("chat-message-user").filter({ hasText: "buy some AAPL please" }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // The assistant reply from the pinned fixture appears verbatim.
    await expect(
      page.getByTestId("chat-message-assistant").filter({ hasText: fixture.message }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // A trade chip is rendered inline. Either status is acceptable — the mock
    // fixture asks for a BUY, and the backend either executes at the current
    // simulator price (executed) or rejects on insufficient cash (rejected).
    // The key guarantee is that failed trades are NOT stripped from the
    // response (PLAN.md §9) so a chip must always be visible.
    const executedChip = page.getByTestId("trade-chip-executed");
    const rejectedChip = page.getByTestId("trade-chip-rejected");
    await expect(executedChip.or(rejectedChip).first()).toBeVisible({
      timeout: 15_000,
    });

    // And the chip text reflects the fixture's side/ticker.
    const chipText = await executedChip
      .or(rejectedChip)
      .first()
      .textContent();
    expect(chipText).toMatch(/buy/i);
    expect(chipText).toMatch(/AAPL/);
  });
});
