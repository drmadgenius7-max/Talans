export interface SendMessageInput {
  to: string;
  subject?: string;
  body: string;
}

export interface MessageProvider {
  readonly name: string;
  send(input: SendMessageInput): Promise<{ success: boolean; providerRef?: string }>;
}
