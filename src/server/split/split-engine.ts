/**
 * Split Engine — pure business logic for turning an expense amount into
 * per-participant owed amounts. No I/O, no Prisma — fully unit-testable.
 *
 * Every function returns a Map<participantId, minorUnits> whose values
 * always sum to exactly the input total (rounding remainder is distributed
 * deterministically, never dropped or duplicated).
 */
import { allocateEqual, allocateByWeights, addMoney } from "@/lib/money";

export class SplitValidationError extends Error {}

export function equalSplit(totalMinor: number, participantIds: string[]): Map<string, number> {
  if (participantIds.length === 0) throw new SplitValidationError("لازم يكون فيه مشارك واحد على الأقل");
  const shares = allocateEqual(totalMinor, participantIds.length);
  return new Map(participantIds.map((id, i) => [id, shares[i]!]));
}

export interface ExactEntry {
  participantId: string;
  amountMinor: number;
}

export function exactSplit(entries: ExactEntry[], totalMinor: number): Map<string, number> {
  if (entries.length === 0) throw new SplitValidationError("لازم يكون فيه مشارك واحد على الأقل");
  const sum = addMoney(...entries.map((e) => e.amountMinor));
  if (sum !== totalMinor) {
    throw new SplitValidationError(
      `مجموع المبالغ (${sum}) لا يساوي إجمالي المصروف (${totalMinor})`,
    );
  }
  return new Map(entries.map((e) => [e.participantId, e.amountMinor]));
}

export interface PercentageEntry {
  participantId: string;
  percentage: number;
}

const PERCENTAGE_EPSILON = 0.01;

export function percentageSplit(totalMinor: number, entries: PercentageEntry[]): Map<string, number> {
  if (entries.length === 0) throw new SplitValidationError("لازم يكون فيه مشارك واحد على الأقل");
  const sumPct = entries.reduce((s, e) => s + e.percentage, 0);
  if (Math.abs(sumPct - 100) > PERCENTAGE_EPSILON) {
    throw new SplitValidationError(`مجموع النسب يجب أن يساوي 100% (الحالي: ${sumPct}%)`);
  }
  const shares = allocateByWeights(
    totalMinor,
    entries.map((e) => e.percentage),
  );
  return new Map(entries.map((e, i) => [e.participantId, shares[i]!]));
}

export interface ShareEntry {
  participantId: string;
  shares: number;
}

export function sharesSplit(totalMinor: number, entries: ShareEntry[]): Map<string, number> {
  if (entries.length === 0) throw new SplitValidationError("لازم يكون فيه مشارك واحد على الأقل");
  if (entries.some((e) => e.shares <= 0)) {
    throw new SplitValidationError("عدد الحصص يجب أن يكون أكبر من صفر");
  }
  const shares = allocateByWeights(
    totalMinor,
    entries.map((e) => e.shares),
  );
  return new Map(entries.map((e, i) => [e.participantId, shares[i]!]));
}

export interface ItemizedItem {
  itemId: string;
  amountMinor: number;
  participantIds: string[];
}

/** Splits each item's cost equally among the participants assigned to it,
 * then sums per participant. Does NOT include adjustments (tax/tip/etc) —
 * call distributeAdjustment() afterwards for each adjustment line. */
export function itemizedSplit(items: ItemizedItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.participantIds.length === 0) {
      throw new SplitValidationError(`العنصر يحتاج مشارك واحد على الأقل`);
    }
    const shares = equalSplit(item.amountMinor, item.participantIds);
    for (const [participantId, amount] of shares) {
      totals.set(participantId, (totals.get(participantId) ?? 0) + amount);
    }
  }
  return totals;
}

/**
 * Distributes an adjustment (tax, VAT, discount, delivery, service charge,
 * tip, other) proportionally across participants' current base amounts,
 * and returns the NEW totals (base + allocated adjustment). Discounts
 * should be passed as a negative adjustmentMinor.
 */
export function distributeAdjustment(
  baseAmounts: Map<string, number>,
  adjustmentMinor: number,
): Map<string, number> {
  const ids = [...baseAmounts.keys()];
  const weights = ids.map((id) => Math.max(baseAmounts.get(id) ?? 0, 0));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  if (totalWeight === 0) {
    // No base weight to distribute proportionally to (e.g. all-zero items) —
    // fall back to equal split of the adjustment itself.
    const equalShares = allocateEqual(adjustmentMinor, ids.length);
    return new Map(ids.map((id, i) => [id, (baseAmounts.get(id) ?? 0) + equalShares[i]!]));
  }

  const allocated = allocateByWeights(adjustmentMinor, weights);
  return new Map(ids.map((id, i) => [id, (baseAmounts.get(id) ?? 0) + allocated[i]!]));
}

export function sumMap(map: Map<string, number>): number {
  return [...map.values()].reduce((s, v) => s + v, 0);
}

export function assertMapSumsTo(map: Map<string, number>, expected: number, label = "split") {
  const sum = sumMap(map);
  if (sum !== expected) {
    throw new SplitValidationError(`${label}: مجموع (${sum}) لا يساوي المتوقع (${expected})`);
  }
}
