export type PaymentRequestStatus =
  | "DRAFT"
  | "PENDING"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED"
  | "FAILED";

const ALLOWED_TRANSITIONS: Record<PaymentRequestStatus, PaymentRequestStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "FAILED"],
  VIEWED: ["PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "FAILED"],
  PARTIALLY_PAID: ["PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"],
  PAID: ["REFUNDED"],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: ["PENDING"],
};

export function canTransitionPaymentRequest(from: PaymentRequestStatus, to: PaymentRequestStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class InvalidStateTransitionError extends Error {}

export function assertPaymentRequestTransition(from: PaymentRequestStatus, to: PaymentRequestStatus) {
  if (!canTransitionPaymentRequest(from, to)) {
    throw new InvalidStateTransitionError(`لا يمكن الانتقال من ${from} إلى ${to}`);
  }
}

export function deriveStatusFromPayment(
  paidMinor: number,
  totalMinor: number,
  dueDate: Date | null,
): PaymentRequestStatus {
  if (paidMinor >= totalMinor && totalMinor > 0) return "PAID";
  if (paidMinor > 0) return "PARTIALLY_PAID";
  if (dueDate && dueDate.getTime() < Date.now()) return "OVERDUE";
  return "PENDING";
}
