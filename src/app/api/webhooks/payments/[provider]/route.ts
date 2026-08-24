import { NextResponse, type NextRequest } from "next/server";
import { getPaymentProvider } from "@/server/payments/provider";
import { processWebhookEvent } from "@/server/payments/service";
import { WebhookVerificationError } from "@/server/payments/types";

/**
 * Real PSP webhook entry point (spec §46). The mock simulator calls
 * processWebhookEvent() directly in-process instead of hitting this route
 * over HTTP, but the same verification + idempotent-processing path is
 * exercised either way. A real provider integration points its webhook
 * URL at /api/webhooks/payments/<provider-name> and this route takes over
 * unchanged.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params;
  const provider = getPaymentProvider();

  if (provider.name !== providerName) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-qitta-signature");

  try {
    const event = await provider.handleWebhook(rawBody, signature);
    const result = await processWebhookEvent(event, provider.name);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.error("[webhook] processing failed", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
