function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  appUrl: required("APP_URL", "http://localhost:3000"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  databaseUrl: required("DATABASE_URL"),

  authSecret: required("AUTH_SECRET", "dev-only-insecure-secret-change-me-please-32chars-min"),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "qitta_session",
  sessionMaxAgeDays: Number(process.env.SESSION_MAX_AGE_DAYS ?? "30"),

  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "mock") as "mock" | (string & {}),
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-only-webhook-secret",

  storageProvider: (process.env.STORAGE_PROVIDER ?? "local") as "local" | (string & {}),
  storageLocalDir: process.env.STORAGE_LOCAL_DIR ?? "./storage/uploads",
  storageMaxUploadBytes: Number(process.env.STORAGE_MAX_UPLOAD_BYTES ?? "10485760"),

  smsProvider: process.env.SMS_PROVIDER ?? "mock",
  whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "mock",
  emailProvider: process.env.EMAIL_PROVIDER ?? "mock",
  emailFrom: process.env.EMAIL_FROM ?? "Qitta <no-reply@qitta.sa>",
  ocrProvider: process.env.OCR_PROVIDER ?? "none",

  defaultLocale: process.env.DEFAULT_LOCALE ?? "ar",
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? "Asia/Riyadh",
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? "SAR",

  enableDemoSeed: (process.env.ENABLE_DEMO_SEED ?? "true") === "true",
};

/**
 * True only when a real (non-mock) payment provider is configured.
 * Used to hard-block fake "successful" charges in production — see
 * src/server/payments/provider.ts.
 */
export const hasRealPaymentProvider = env.paymentProvider !== "mock";
