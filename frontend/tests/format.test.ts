import { describe, expect, it } from "vitest";
import { fmtMoney, fmtPct, fmtPrice, fmtQty } from "@/lib/format";

describe("formatters", () => {
  it("fmtMoney handles null and numbers", () => {
    expect(fmtMoney(null)).toBe("—");
    expect(fmtMoney(undefined)).toBe("—");
    expect(fmtMoney(1234.5)).toBe("$1,234.50");
    expect(fmtMoney(-12.3)).toBe("-$12.30");
  });

  it("fmtPct formats with sign", () => {
    expect(fmtPct(1.23)).toBe("+1.23%");
    expect(fmtPct(-1.23)).toBe("-1.23%");
    expect(fmtPct(0)).toBe("0.00%");
    expect(fmtPct(null)).toBe("—");
  });

  it("fmtPct can suppress the sign", () => {
    expect(fmtPct(1.23, false)).toBe("1.23%");
    expect(fmtPct(-1.23, false)).toBe("1.23%");
  });

  it("fmtPrice uses two decimals", () => {
    expect(fmtPrice(10)).toBe("10.00");
    expect(fmtPrice(10.004)).toBe("10.00");
    expect(fmtPrice(10.006)).toBe("10.01");
    expect(fmtPrice(null)).toBe("—");
  });

  it("fmtQty trims trailing zeros up to 4 decimals", () => {
    expect(fmtQty(10)).toBe("10");
    expect(fmtQty(10.5)).toBe("10.5");
    expect(fmtQty(null)).toBe("—");
  });
});
