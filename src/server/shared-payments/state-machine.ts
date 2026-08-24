/**
 * Shared Payment state machine (spec §19). Enforced centrally so no code
 * path can push a campaign into an illogical transition (e.g. COMPLETED ->
 * ACTIVE, or CANCELLED -> FUNDED).
 */
export type SharedPaymentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PARTIALLY_FUNDED"
  | "FUNDED"
  | "PROCESSING"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "FAILED";

const ALLOWED_TRANSITIONS: Record<SharedPaymentStatus, SharedPaymentStatus[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PARTIALLY_FUNDED", "FUNDED", "EXPIRED", "CANCELLED"],
  PARTIALLY_FUNDED: ["PARTIALLY_FUNDED", "FUNDED", "EXPIRED", "CANCELLED", "REFUND_PENDING"],
  FUNDED: ["PROCESSING", "REFUND_PENDING", "COMPLETED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  EXPIRED: ["REFUND_PENDING", "REFUNDED"],
  CANCELLED: ["REFUND_PENDING", "REFUNDED"],
  REFUND_PENDING: ["REFUNDED", "FAILED"],
  REFUNDED: [],
  FAILED: ["REFUND_PENDING"],
};

export function canTransitionSharedPayment(from: SharedPaymentStatus, to: SharedPaymentStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class InvalidStateTransitionError extends Error {}

export function assertSharedPaymentTransition(from: SharedPaymentStatus, to: SharedPaymentStatus) {
  if (!canTransitionSharedPayment(from, to)) {
    throw new InvalidStateTransitionError(`لا يمكن الانتقال من ${from} إلى ${to}`);
  }
}

/** Derives the funding status from collected/target amounts, used after
 * every contribution to decide the next status automatically. */
export function deriveFundingStatus(
  collectedMinor: number,
  targetMinor: number,
  currentStatus: SharedPaymentStatus,
): SharedPaymentStatus {
  if (currentStatus === "CANCELLED" || currentStatus === "EXPIRED" || currentStatus === "COMPLETED") {
    return currentStatus;
  }
  if (collectedMinor >= targetMinor && targetMinor > 0) return "FUNDED";
  if (collectedMinor > 0) return "PARTIALLY_FUNDED";
  return "ACTIVE";
}
