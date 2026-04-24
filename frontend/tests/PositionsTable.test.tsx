import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PositionsTable } from "@/components/PositionsTable";
import type { Position } from "@/lib/types";

const positions: Position[] = [
  {
    ticker: "AAPL",
    quantity: 10,
    avg_cost: 180,
    current_price: 200,
    market_value: 2000,
    unrealized_pl: 200,
    unrealized_pl_pct: 11.11,
  },
  {
    ticker: "TSLA",
    quantity: 5,
    avg_cost: 250,
    current_price: 220,
    market_value: 1100,
    unrealized_pl: -150,
    unrealized_pl_pct: -12.0,
  },
];

describe("PositionsTable", () => {
  it("renders rows for each position with formatted numbers", () => {
    render(<PositionsTable positions={positions} onSelect={vi.fn()} />);
    expect(screen.getByTestId("position-row-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("position-row-TSLA")).toBeInTheDocument();
    expect(screen.getByText("$2,000.00")).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getByText("-$150.00")).toBeInTheDocument();
  });

  it("shows an empty state when there are no positions", () => {
    render(<PositionsTable positions={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/No positions/)).toBeInTheDocument();
  });

  it("calls onSelect when a row is clicked", () => {
    const onSelect = vi.fn();
    render(<PositionsTable positions={positions} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("position-row-AAPL"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });
});
