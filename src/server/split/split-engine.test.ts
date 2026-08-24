import { describe, it, expect } from "vitest";
import {
  equalSplit,
  exactSplit,
  percentageSplit,
  sharesSplit,
  itemizedSplit,
  distributeAdjustment,
  sumMap,
  SplitValidationError,
} from "./split-engine";

describe("equalSplit", () => {
  it("splits evenly when divisible", () => {
    const result = equalSplit(800_00, ["a", "b", "c", "d"]);
    expect(result.get("a")).toBe(200_00);
    expect(sumMap(result)).toBe(800_00);
  });

  it("distributes remainder halalas deterministically when not divisible", () => {
    // 100.00 SAR / 3 = 33.33 repeating -> 3334 + 3333 + 3333
    const result = equalSplit(100_00, ["a", "b", "c"]);
    expect(sumMap(result)).toBe(100_00);
    expect(result.get("a")).toBe(3334);
    expect(result.get("b")).toBe(3333);
    expect(result.get("c")).toBe(3333);
  });

  it("throws for empty participant list", () => {
    expect(() => equalSplit(100, [])).toThrow(SplitValidationError);
  });
});

describe("exactSplit", () => {
  it("accepts amounts that sum exactly to the total", () => {
    const result = exactSplit(
      [
        { participantId: "a", amountMinor: 30_00 },
        { participantId: "b", amountMinor: 20_00 },
      ],
      50_00,
    );
    expect(sumMap(result)).toBe(50_00);
  });

  it("rejects amounts that do not sum to the total", () => {
    expect(() =>
      exactSplit(
        [
          { participantId: "a", amountMinor: 30_00 },
          { participantId: "b", amountMinor: 15_00 },
        ],
        50_00,
      ),
    ).toThrow(SplitValidationError);
  });
});

describe("percentageSplit", () => {
  it("splits by percentage summing to 100", () => {
    const result = percentageSplit(1000_00, [
      { participantId: "a", percentage: 50 },
      { participantId: "b", percentage: 30 },
      { participantId: "c", percentage: 20 },
    ]);
    expect(result.get("a")).toBe(500_00);
    expect(result.get("b")).toBe(300_00);
    expect(result.get("c")).toBe(200_00);
    expect(sumMap(result)).toBe(1000_00);
  });

  it("handles repeating-decimal percentages without losing halalas", () => {
    const result = percentageSplit(100_00, [
      { participantId: "a", percentage: 33.33 },
      { participantId: "b", percentage: 33.33 },
      { participantId: "c", percentage: 33.34 },
    ]);
    expect(sumMap(result)).toBe(100_00);
  });

  it("rejects percentages that don't sum to 100", () => {
    expect(() =>
      percentageSplit(100_00, [
        { participantId: "a", percentage: 50 },
        { participantId: "b", percentage: 40 },
      ]),
    ).toThrow(SplitValidationError);
  });
});

describe("sharesSplit", () => {
  it("splits proportionally to shares", () => {
    // أنس = حصتين, محمد = حصة, خالد = حصة  (total 4 shares)
    const result = sharesSplit(400_00, [
      { participantId: "anas", shares: 2 },
      { participantId: "mohammed", shares: 1 },
      { participantId: "khaled", shares: 1 },
    ]);
    expect(result.get("anas")).toBe(200_00);
    expect(result.get("mohammed")).toBe(100_00);
    expect(result.get("khaled")).toBe(100_00);
    expect(sumMap(result)).toBe(400_00);
  });
});

describe("itemizedSplit", () => {
  it("splits each item among its assigned participants and sums per person", () => {
    // محمد: Burger 35 + Juice 10 = 45
    // خالد: Pizza 45
    const result = itemizedSplit([
      { itemId: "burger", amountMinor: 35_00, participantIds: ["mohammed"] },
      { itemId: "juice", amountMinor: 10_00, participantIds: ["mohammed"] },
      { itemId: "pizza", amountMinor: 45_00, participantIds: ["khaled"] },
    ]);
    expect(result.get("mohammed")).toBe(45_00);
    expect(result.get("khaled")).toBe(45_00);
  });

  it("splits a shared item equally among its assignees", () => {
    const result = itemizedSplit([
      { itemId: "shared-fries", amountMinor: 10_00, participantIds: ["a", "b", "c"] },
    ]);
    expect(sumMap(result)).toBe(10_00);
  });
});

describe("distributeAdjustment", () => {
  it("distributes tax proportionally to base amounts", () => {
    const base = new Map([
      ["mohammed", 45_00],
      ["khaled", 45_00],
    ]);
    const withTax = distributeAdjustment(base, 9_00); // 10% VAT
    expect(withTax.get("mohammed")).toBe(49_50);
    expect(withTax.get("khaled")).toBe(49_50);
  });

  it("handles a discount as a negative adjustment", () => {
    const base = new Map([
      ["a", 60_00],
      ["b", 40_00],
    ]);
    const withDiscount = distributeAdjustment(base, -10_00);
    expect(withDiscount.get("a")! + withDiscount.get("b")!).toBe(90_00);
  });

  it("falls back to equal split when base amounts are all zero", () => {
    const base = new Map([
      ["a", 0],
      ["b", 0],
    ]);
    const result = distributeAdjustment(base, 10_00);
    expect(result.get("a")! + result.get("b")!).toBe(10_00);
  });
});
