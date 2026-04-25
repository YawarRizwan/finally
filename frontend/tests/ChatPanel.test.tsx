import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "@/components/ChatPanel";
import type { ChatMessage } from "@/lib/types";

function msg(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "m-1",
    role: "assistant",
    content: "",
    actions: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("ChatPanel", () => {
  it("renders user and assistant messages", () => {
    const messages: ChatMessage[] = [
      msg({ id: "1", role: "user", content: "Hello" }),
      msg({ id: "2", role: "assistant", content: "Hi there" }),
    ];
    render(<ChatPanel messages={messages} loading={false} onSend={vi.fn()} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByTestId("chat-message-user")).toBeInTheDocument();
    expect(screen.getByTestId("chat-message-assistant")).toBeInTheDocument();
  });

  it("renders an executed trade chip inline", () => {
    const messages: ChatMessage[] = [
      msg({
        id: "1",
        role: "assistant",
        content: "Bought 10 AAPL.",
        actions: {
          trades: [
            {
              ticker: "AAPL",
              side: "buy",
              quantity: 10,
              status: "executed",
              price: 185.25,
              notional: 1852.5,
              executed_at: "2026-01-01T00:00:00Z",
              error: null,
            },
          ],
          watchlist_changes: [],
        },
      }),
    ];
    render(<ChatPanel messages={messages} loading={false} onSend={vi.fn()} />);
    const chip = screen.getByTestId("trade-chip-executed");
    expect(chip).toBeInTheDocument();
    expect(chip.textContent).toMatch(/buy\s+10\s+AAPL/i);
    expect(chip.textContent).toMatch(/185\.25/);
  });

  it("renders a rejected trade chip (never stripped)", () => {
    const messages: ChatMessage[] = [
      msg({
        id: "1",
        role: "assistant",
        content: "Tried to buy but insufficient cash.",
        actions: {
          trades: [
            {
              ticker: "AAPL",
              side: "buy",
              quantity: 1000,
              status: "rejected",
              price: null,
              notional: null,
              executed_at: null,
              error: "Insufficient cash",
            },
          ],
          watchlist_changes: [],
        },
      }),
    ];
    render(<ChatPanel messages={messages} loading={false} onSend={vi.fn()} />);
    const chip = screen.getByTestId("trade-chip-rejected");
    expect(chip).toBeInTheDocument();
    expect(chip.textContent).toContain("Insufficient cash");
  });

  it("renders a rejected watchlist change chip", () => {
    const messages: ChatMessage[] = [
      msg({
        id: "1",
        role: "assistant",
        content: "Tried to add XYZ.",
        actions: {
          trades: [],
          watchlist_changes: [
            {
              ticker: "XYZ",
              action: "add",
              status: "rejected",
              error: "Unknown ticker",
            },
          ],
        },
      }),
    ];
    render(<ChatPanel messages={messages} loading={false} onSend={vi.fn()} />);
    const chip = screen.getByTestId("watchlist-chip-rejected");
    expect(chip).toBeInTheDocument();
    expect(chip.textContent).toContain("Unknown ticker");
  });

  it("shows the loading bubble when loading is true", () => {
    render(<ChatPanel messages={[]} loading={true} onSend={vi.fn()} />);
    expect(screen.getByTestId("chat-loading")).toBeInTheDocument();
  });

  it("sends the input via onSend and clears the field", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatPanel messages={[]} loading={false} onSend={onSend} />);
    const input = screen.getByLabelText("Chat message");
    await user.type(input, "analyze my portfolio");
    await user.click(screen.getByTestId("chat-send"));
    expect(onSend).toHaveBeenCalledWith("analyze my portfolio");
  });
});
