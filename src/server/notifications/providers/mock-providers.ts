import "server-only";
import type { MessageProvider, SendMessageInput } from "./types";

/**
 * Mock channel providers — log to the server console instead of sending
 * anything real. Swap PAYMENT_PROVIDER-style env vars (SMS_PROVIDER,
 * WHATSAPP_PROVIDER, EMAIL_PROVIDER) to a real provider name and register
 * an implementation here when one is wired up.
 */
class MockChannelProvider implements MessageProvider {
  constructor(public readonly name: string) {}

  async send(input: SendMessageInput): Promise<{ success: boolean; providerRef?: string }> {
    // eslint-disable-next-line no-console
    console.log(`[mock:${this.name}] -> ${input.to}: ${input.subject ? `${input.subject} — ` : ""}${input.body}`);
    return { success: true, providerRef: `mock_${this.name}_${Date.now()}` };
  }
}

export const mockSmsProvider: MessageProvider = new MockChannelProvider("sms");
export const mockWhatsappProvider: MessageProvider = new MockChannelProvider("whatsapp");
export const mockEmailProvider: MessageProvider = new MockChannelProvider("email");
