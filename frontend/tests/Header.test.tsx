import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/Header";
import type { Portfolio } from "@/lib/types";

const samplePortfolio: Portfolio = {
  cash_balance: 5000,
  positions: [],
  total_value: 12345.67,
  total_unrealized_pl: 345.67,
};

describe("Header", () => {
  it("renders the connected status dot", () => {
    render(<Header portfolio={samplePortfolio} status="connected" />);
    const el = screen.getByTestId("connection-status");
    expect(el).toHaveAttribute("data-status", "connected");
    expect(el.textContent).toContain("LIVE");
  });

  it("renders reconnecting and disconnected states", () => {
    const { rerender } = render(
      <Header portfolio={samplePortfolio} status="reconnecting" />,
    );
    expect(screen.getByTestId("connection-status")).toHaveAttribute(
      "data-status",
      "reconnecting",
    );
    rerender(<Header portfolio={samplePortfolio} status="disconnected" />);
    expect(screen.getByTestId("connection-status")).toHaveAttribute(
      "data-status",
      "disconnected",
    );
    expect(screen.getByText("OFFLINE")).toBeInTheDocument();
  });

  it("renders currency and P/L values", () => {
    render(<Header portfolio={samplePortfolio} status="connected" />);
    expect(screen.getByText("$12,345.67")).toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    expect(screen.getByText("$345.67")).toBeInTheDocument();
  });

  it("handles null portfolio gracefully", () => {
    render(<Header portfolio={null} status="disconnected" />);
    // three stat dashes expected (portfolio, cash, P/L)
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(3);
  });
});
