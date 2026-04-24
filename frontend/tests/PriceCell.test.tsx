import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PriceCell } from "@/components/PriceCell";

describe("PriceCell flash animation", () => {
  it("does not flash on initial render", () => {
    render(<PriceCell price={100} direction="flat" />);
    const cell = screen.getByTestId("price-cell");
    expect(cell).toHaveAttribute("data-flash", "");
  });

  it("flashes up when price increases", () => {
    const { rerender } = render(<PriceCell price={100} direction="flat" />);
    rerender(<PriceCell price={101} direction="up" />);
    const cell = screen.getByTestId("price-cell");
    expect(cell).toHaveAttribute("data-flash", "flash-up");
    expect(cell.className).toContain("flash-up");
  });

  it("flashes down when price decreases", () => {
    const { rerender } = render(<PriceCell price={100} direction="flat" />);
    rerender(<PriceCell price={99} direction="down" />);
    const cell = screen.getByTestId("price-cell");
    expect(cell).toHaveAttribute("data-flash", "flash-down");
  });

  it("clears the flash class after 500ms", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<PriceCell price={100} direction="flat" />);
    rerender(<PriceCell price={101} direction="up" />);
    expect(screen.getByTestId("price-cell")).toHaveAttribute("data-flash", "flash-up");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId("price-cell")).toHaveAttribute("data-flash", "");
    vi.useRealTimers();
  });

  it("renders em dash for null price", () => {
    render(<PriceCell price={null} direction={null} />);
    expect(screen.getByTestId("price-cell").textContent).toBe("—");
  });
});
