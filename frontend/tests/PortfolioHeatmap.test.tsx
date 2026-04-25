import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PortfolioHeatmap } from "@/components/PortfolioHeatmap";
import type { Position } from "@/lib/types";

function pos(over: Partial<Position>): Position {
  return {
    ticker: "X",
    quantity: 1,
    avg_cost: 100,
    current_price: 100,
    market_value: 100,
    unrealized_pl: 0,
    unrealized_pl_pct: 0,
    ...over,
  };
}

describe("PortfolioHeatmap", () => {
  it("renders an empty state when there are no positions", () => {
    render(<PortfolioHeatmap positions={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/No positions yet/)).toBeInTheDocument();
  });

  it("renders one tile per position and covers the full canvas area", () => {
    const positions = [
      pos({ ticker: "AAPL", market_value: 3000, unrealized_pl_pct: 5 }),
      pos({ ticker: "TSLA", market_value: 1000, unrealized_pl_pct: -3 }),
    ];
    render(<PortfolioHeatmap positions={positions} onSelect={vi.fn()} />);
    const t1 = screen.getByTestId("heatmap-tile-AAPL");
    const t2 = screen.getByTestId("heatmap-tile-TSLA");
    expect(t1).toBeInTheDocument();
    expect(t2).toBeInTheDocument();
    const rect1 = t1.querySelector("rect");
    const rect2 = t2.querySelector("rect");
    expect(rect1).toBeTruthy();
    expect(rect2).toBeTruthy();
    const area1 = Number(rect1!.getAttribute("width")) * Number(rect1!.getAttribute("height"));
    const area2 = Number(rect2!.getAttribute("width")) * Number(rect2!.getAttribute("height"));
    // AAPL has 3x the market value, so its tile area should be roughly 3x larger.
    expect(area1 / area2).toBeGreaterThan(2.0);
  });

  it("invokes onSelect when a tile is clicked", () => {
    const onSelect = vi.fn();
    render(
      <PortfolioHeatmap
        positions={[pos({ ticker: "AAPL", market_value: 1000 })]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("heatmap-tile-AAPL"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });
});
