import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradeBar } from "@/components/TradeBar";

describe("TradeBar", () => {
  it("pre-fills the ticker from defaultTicker", () => {
    render(<TradeBar defaultTicker="AAPL" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Trade ticker")).toHaveValue("AAPL");
  });

  it("submits a buy trade with the entered values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TradeBar defaultTicker="MSFT" onSubmit={onSubmit} />);
    const qty = screen.getByLabelText("Trade quantity");
    await user.clear(qty);
    await user.type(qty, "5");
    await user.click(screen.getByTestId("trade-buy"));
    expect(onSubmit).toHaveBeenCalledWith({ ticker: "MSFT", quantity: 5, side: "buy" });
  });

  it("submits a sell trade", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TradeBar defaultTicker="AAPL" onSubmit={onSubmit} />);
    await user.click(screen.getByTestId("trade-sell"));
    expect(onSubmit).toHaveBeenCalledWith({
      ticker: "AAPL",
      quantity: 1,
      side: "sell",
    });
  });

  it("rejects non-positive quantity", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TradeBar defaultTicker="AAPL" onSubmit={onSubmit} />);
    const qty = screen.getByLabelText("Trade quantity");
    await user.clear(qty);
    await user.type(qty, "0");
    await user.click(screen.getByTestId("trade-buy"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Quantity must be a positive number/)).toBeInTheDocument();
  });

  it("shows an error when ticker is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TradeBar defaultTicker="" onSubmit={onSubmit} />);
    await user.click(screen.getByTestId("trade-buy"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Ticker required/)).toBeInTheDocument();
  });
});
