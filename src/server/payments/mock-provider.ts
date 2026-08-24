import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { generateSecureToken, safeCompare } from "@/lib/tokens";
import { db } from "@/lib/db";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentOutcome,
  PaymentStatusResult,
  PayoutInput,
  PayoutResult,
  RefundInput,
  RefundResult,
  TransactionResult,
  WebhookEvent,
  WebhookEventType,
} from "./types";
import { WebhookVerificationError } from "./types";

function sign(payload: string): string {
  return createHmac("sha256", env.paymentWebhookSecret).update(payload).digest("hex");
}

/**
 * Simulates a full PSP round trip entirely inside our own app: `createPayment`
 * hands back a redirect to our own /pay simulator UI (no external network
 * call), and `simulate()` is what that UI calls when the user picks an
 * outcome. `simulate()` builds a signed webhook payload and feeds it through
 * the SAME `handleWebhook` verification path a real provider's webhook
 * would use, so the idempotency/signature machinery is exercised for real
 * even though no money moves.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerRef = `mock_${input.internalTransactionId}`;
    return {
      providerRef,
      status: "PENDING",
      redirectUrl: `${env.appUrl}/pay/simulate/${input.internalTransactionId}`,
    };
  }

  async getPaymentStatus(providerRef: string): Promise<PaymentStatusResult> {
    const transactionId = providerRef.replace(/^mock_/, "");
    const txn = await db.transaction.findUnique({ where: { id: transactionId } });
    return {
      providerRef,
      status: (txn?.status as PaymentOutcome) ?? "PENDING",
    };
  }

  async refundPayment(_input: RefundInput): Promise<RefundResult> {
    return {
      providerRefundRef: `mock_refund_${generateSecureToken(8)}`,
      status: "SUCCEEDED",
    };
  }

  async createPayout(_input: PayoutInput): Promise<PayoutResult> {
    return {
      providerPayoutRef: `mock_payout_${generateSecureToken(8)}`,
      status: "SUCCEEDED",
    };
  }

  async getTransaction(providerRef: string): Promise<TransactionResult> {
    const transactionId = providerRef.replace(/^mock_/, "");
    const txn = await db.transaction.findUniqueOrThrow({ where: { id: transactionId } });
    return {
      providerRef,
      amountMinor: txn.amount,
      currency: txn.currency,
      status: txn.status as PaymentOutcome,
    };
  }

  async handleWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent> {
    if (!signature || !safeCompare(sign(rawBody), signature)) {
      throw new WebhookVerificationError("Invalid webhook signature");
    }
    const payload = JSON.parse(rawBody) as {
      eventId: string;
      providerRef: string;
      type: WebhookEventType;
      amountMinor: number;
      currency: string;
      occurredAt: string;
    };
    return {
      eventId: payload.eventId,
      providerRef: payload.providerRef,
      type: payload.type,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      occurredAt: new Date(payload.occurredAt),
      raw: payload,
    };
  }

  /** Mock-only: simulates the PSP calling our webhook after the payer picks
   * an outcome in the simulator UI. Not part of the PaymentProvider
   * interface — a real provider's webhook arrives over HTTP instead. */
  buildSimulatedWebhookPayload(args: {
    transactionId: string;
    amountMinor: number;
    currency: string;
    outcome: "SUCCEEDED" | "FAILED" | "CANCELLED" | "PENDING";
  }): { rawBody: string; signature: string } {
    const typeMap: Record<string, WebhookEventType> = {
      SUCCEEDED: "payment.succeeded",
      FAILED: "payment.failed",
      CANCELLED: "payment.cancelled",
      PENDING: "payment.pending",
    };
    const payload = {
      eventId: `evt_${generateSecureToken(12)}`,
      providerRef: `mock_${args.transactionId}`,
      type: typeMap[args.outcome]!,
      amountMinor: args.amountMinor,
      currency: args.currency,
      occurredAt: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(payload);
    return { rawBody, signature: sign(rawBody) };
  }
}
