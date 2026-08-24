import { describe, it, expect } from "vitest";
import { toMinorUnits, toDecimalString, formatMoney, allocateEqual, allocateByWeights, addMoney } from "./money";

describe("toMinorUnits", () => {
  it("converts a 2-decimal currency string", () => {
    expect(toMinorUnits("150.25", "SAR")).toBe(15025);
    expect(toMinorUnits("800", "SAR")).toBe(80000);
  });

  it("converts a 3-decimal currency (BHD/KWD)", () => {
    expect(toMinorUnits("1.500", "BHD")).toBe(1500);
    expect(toMinorUnits("1.5", "BHD")).toBe(1500);
  });

  it("rejects invalid input", () => {
    expect(() => toMinorUnits("abc", "SAR")).toThrow();
    expect(() => toMinorUnits("", "SAR")).toThrow();
  });
});

describe("toDecimalString", () => {
  it("round-trips exactly", () => {
    expect(toDecimalString(15025, "SAR")).toBe("150.25");
    expect(toDecimalString(1500, "BHD")).toBe("1.500");
  });

  it("handles negative amounts", () => {
    expect(toDecimalString(-15025, "SAR")).toBe("-150.25");
  });
});

describe("formatMoney", () => {
  it("formats with thousands separators and the currency symbol", () => {
    expect(formatMoney(123456_78, "SAR", "ar")).toBe("123,456.78 ر.س");
  });
});

describe("allocateEqual", () => {
  it("sums exactly to the total for any divisor", () => {
    for (const count of [1, 2, 3, 4, 5, 7, 11, 13]) {
      const shares = allocateEqual(1000_00, count);
      expect(addMoney(...shares)).toBe(1000_00);
    }
  });

  it("never differs between shares by more than 1 minor unit", () => {
    const shares = allocateEqual(100_01, 3);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
  });
});

describe("allocateByWeights", () => {
  it("sums exactly to the total", () => {
    const shares = allocateByWeights(1000_00, [1, 1, 1]);
    expect(addMoney(...shares)).toBe(1000_00);
  });

  it("respects proportional weighting", () => {
    const shares = allocateByWeights(400_00, [2, 1, 1]);
    expect(shares[0]).toBe(200_00);
  });
});
