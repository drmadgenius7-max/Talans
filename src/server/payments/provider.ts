import "server-only";
import { env, hasRealPaymentProvider } from "@/lib/env";
import { MockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./types";

let cached: PaymentProvider | null = null;

/**
 * Returns the configured PaymentProvider. Only "mock" exists today; set
 * PAYMENT_PROVIDER to a real provider name once one is implemented and
 * registered here.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  switch (env.paymentProvider) {
    case "mock":
      cached = new MockPaymentProvider();
      return cached;
    default:
      throw new Error(
        `Unknown PAYMENT_PROVIDER "${env.paymentProvider}". Only "mock" is implemented — ` +
          `add a new provider class implementing PaymentProvider and register it here.`,
      );
  }
}

/**
 * Production safety guard (spec §79): a production deployment must never
 * present a simulated payment as if it were a real one. Call this before
 * letting a user initiate or simulate a payment.
 */
export function assertRealPaymentsAllowed(): void {
  if (env.isProd && !hasRealPaymentProvider) {
    throw new PaymentsUnavailableError();
  }
}

export class PaymentsUnavailableError extends Error {
  constructor() {
    super("لم يتم ربط بوابة دفع حقيقية بعد. الدفع الفعلي غير متاح حاليًا.");
  }
}
