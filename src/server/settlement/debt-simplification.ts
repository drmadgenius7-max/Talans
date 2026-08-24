/**
 * Debt Simplification — turns a set of net balances into the minimum
 * number of transfers required to settle a group fully.
 *
 * Classic greedy "min cash flow" algorithm: repeatedly match the biggest
 * debtor with the biggest creditor. This does not always yield the
 * mathematically optimal minimum transaction count (that's NP-hard in the
 * general case), but it is a very close, deterministic, well-understood
 * approximation used by production expense-splitting apps.
 */

export interface NetBalance {
  memberId: string;
  /** positive = is owed money (creditor), negative = owes money (debtor) */
  netMinor: number;
}

export interface SettlementTransfer {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
}

export function simplifyDebts(balances: NetBalance[]): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => b.netMinor < 0)
    .map((b) => ({ memberId: b.memberId, remaining: -b.netMinor }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => b.netMinor > 0)
    .map((b) => ({ memberId: b.memberId, remaining: b.netMinor }))
    .sort((a, b) => b.remaining - a.remaining);

  const totalDebt = debtors.reduce((s, d) => s + d.remaining, 0);
  const totalCredit = creditors.reduce((s, c) => s + c.remaining, 0);
  if (totalDebt !== totalCredit) {
    throw new Error(
      `Balances are not zero-sum: total debt ${totalDebt} !== total credit ${totalCredit}. This indicates a ledger bug.`,
    );
  }

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      transfers.push({ fromMemberId: debtor.memberId, toMemberId: creditor.memberId, amountMinor: amount });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining === 0) i++;
    if (creditor.remaining === 0) j++;
  }

  return transfers;
}

/** Computes net balances from a flat list of ledger-style signed amounts. */
export function computeNetBalances(entries: { memberId: string; amountMinor: number }[]): NetBalance[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    totals.set(e.memberId, (totals.get(e.memberId) ?? 0) + e.amountMinor);
  }
  return [...totals.entries()]
    .map(([memberId, netMinor]) => ({ memberId, netMinor }))
    .filter((b) => b.netMinor !== 0);
}
