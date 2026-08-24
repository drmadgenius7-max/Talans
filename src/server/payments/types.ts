/**
 * Payment Provider Abstraction — every payment/refund/payout operation in
 * Qitta goes through this interface. Today only MockPaymentProvider exists;
 * a real Saudi PSP integration is added later by implementing this same
 * interface (e.g. SaudiPspProvider) and flipping PAYMENT_PROVIDER in env —
 * no call site elsewhere in the app needs to change.
 */

export type PaymentOutcome = "SUCCEEDED" | "FAILED" | "CANCELLED" | "PENDING";

export interface CreatePaymentInput {
  /** Our own transaction id — passed through so the provider can echo it back on webhooks. */
  internalTransactionId: string;
  amountMinor: number;
  currency: string;
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  providerRef: string;
  status: PaymentOutcome;
  /** Where to send the payer to complete payment. For the mock provider this is our own simulator page. */
  redirectUrl: string;
}

export interface PaymentStatusResult {
  providerRef: string;
  status: PaymentOutcome;
}

export interface RefundInput {
  providerRef: string;
  amountMinor: number;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundResult {
  providerRefundRef: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
}

export interface PayoutInput {
  amountMinor: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryContact?: string;
  idempotencyKey: string;
}

export interface PayoutResult {
  providerPayoutRef: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
}

export interface TransactionResult {
  providerRef: string;
  amountMinor: number;
  currency: string;
  status: PaymentOutcome;
}

export type WebhookEventType =
  | "payment.pending"
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled"
  | "refund.succeeded"
  | "refund.failed";

export interface WebhookEvent {
  eventId: string;
  providerRef: string;
  type: WebhookEventType;
  amountMinor: number;
  currency: string;
  occurredAt: Date;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(providerRef: string): Promise<PaymentStatusResult>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
  createPayout(input: PayoutInput): Promise<PayoutResult>;
  getTransaction(providerRef: string): Promise<TransactionResult>;
  handleWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent>;
}

export class WebhookVerificationError extends Error {}
