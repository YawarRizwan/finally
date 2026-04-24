import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Watchlist } from "@/components/Watchlist";
import { priceStore } from "@/lib/priceStore";

describe("Watchlist", () => {
  beforeEach(() => {
    priceStore._reset();
  });

  it("renders the default tickers and responds to selection clicks", () => {
    const onSelect = vi.fn();
    render(
      <Watchlist
        tickers={["AAPL", "GOOGL", "MSFT"]}
        selected={"AAPL"}
        onSelect={onSelect}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId("watchlist-row-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("watchlist-row-GOOGL")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("watchlist-row-GOOGL"));
    expect(onSelect).toHaveBeenCalledWith("GOOGL");
  });

  it("calls onAdd when the form is submitted with a ticker", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <Watchlist
        tickers={["AAPL"]}
        selected={"AAPL"}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Add ticker");
    await user.type(input, "pypl");
    await user.click(screen.getByText("Add"));
    expect(onAdd).toHaveBeenCalledWith("PYPL");
  });

  it("calls onRemove when the remove button is clicked", () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    render(
      <Watchlist
        tickers={["AAPL"]}
        selected={"AAPL"}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove AAPL"));
    expect(onRemove).toHaveBeenCalledWith("AAPL");
  });

  it("renders the daily change % from live store", () => {
    act(() => {
      priceStore.hydrateFromWatchlist([
        {
          ticker: "AAPL",
          price: 110,
          prev_price: 109,
          open_price: 100,
          direction: "up",
          timestamp: "2026-04-10T12:00:00Z",
        },
      ]);
    });
    render(
      <Watchlist
        tickers={["AAPL"]}
        selected={"AAPL"}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    // +10.00% daily change (110 vs open 100)
    expect(screen.getByText("+10.00%")).toBeInTheDocument();
  });
});
