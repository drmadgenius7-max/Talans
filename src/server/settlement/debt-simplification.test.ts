import { describe, it, expect } from "vitest";
import { simplifyDebts, computeNetBalances, type NetBalance } from "./debt-simplification";

describe("simplifyDebts", () => {
  it("reduces a trip's crossing debts to a minimal transfer plan (spec scenario C)", () => {
    // أنس دفع الفندق 1200، محمد دفع المطعم 600، خالد دفع البنزين 300، أحمد دفع 0
    // إجمالي = 2100 / 4 = 525 لكل شخص
    const balances: NetBalance[] = [
      { memberId: "anas", netMinor: 1200_00 - 525_00 }, // +675
      { memberId: "mohammed", netMinor: 600_00 - 525_00 }, // +75
      { memberId: "khaled", netMinor: 300_00 - 525_00 }, // -225
      { memberId: "ahmed", netMinor: 0 - 525_00 }, // -525
    ];

    const transfers = simplifyDebts(balances);

    const sumByDebtor = new Map<string, number>();
    for (const t of transfers) {
      sumByDebtor.set(t.fromMemberId, (sumByDebtor.get(t.fromMemberId) ?? 0) + t.amountMinor);
    }
    expect(sumByDebtor.get("khaled")).toBe(225_00);
    expect(sumByDebtor.get("ahmed")).toBe(525_00);

    // Never more transfers than (number of non-zero balances - 1)
    expect(transfers.length).toBeLessThanOrEqual(balances.length - 1);

    // Every transfer must net out to zero overall
    const net = new Map<string, number>();
    for (const b of balances) net.set(b.memberId, b.netMinor);
    for (const t of transfers) {
      net.set(t.fromMemberId, net.get(t.fromMemberId)! + t.amountMinor);
      net.set(t.toMemberId, net.get(t.toMemberId)! - t.amountMinor);
    }
    for (const v of net.values()) expect(v).toBe(0);
  });

  it("produces zero transfers when everyone is already even", () => {
    const transfers = simplifyDebts([
      { memberId: "a", netMinor: 0 },
      { memberId: "b", netMinor: 0 },
    ]);
    expect(transfers).toHaveLength(0);
  });

  it("handles the simple two-person case", () => {
    const transfers = simplifyDebts([
      { memberId: "a", netMinor: -200_00 },
      { memberId: "b", netMinor: 200_00 },
    ]);
    expect(transfers).toEqual([{ fromMemberId: "a", toMemberId: "b", amountMinor: 200_00 }]);
  });

  it("throws when balances are not zero-sum (ledger bug guard)", () => {
    expect(() =>
      simplifyDebts([
        { memberId: "a", netMinor: -100 },
        { memberId: "b", netMinor: 50 },
      ]),
    ).toThrow();
  });
});

describe("computeNetBalances", () => {
  it("sums signed ledger entries per member and drops zero balances", () => {
    const balances = computeNetBalances([
      { memberId: "a", amountMinor: 100 },
      { memberId: "a", amountMinor: -100 },
      { memberId: "b", amountMinor: 50 },
      { memberId: "c", amountMinor: -50 },
    ]);
    expect(balances.find((b) => b.memberId === "a")).toBeUndefined();
    expect(balances.find((b) => b.memberId === "b")?.netMinor).toBe(50);
    expect(balances.find((b) => b.memberId === "c")?.netMinor).toBe(-50);
  });
});
