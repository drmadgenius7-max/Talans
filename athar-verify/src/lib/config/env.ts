import { z } from 'zod';

/**
 * Central, validated configuration.
 *
 * Everything that reads `process.env` in this codebase goes through here so a
 * misconfigured deployment fails loudly at boot instead of silently degrading
 * (e.g. running verification with a default signing secret).
 */

const bool = (dflt: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? dflt : v === 'true' || v === '1'));

const int = (dflt: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? dflt : Number(v)))
    .pipe(z.number().int().positive());

const num = (dflt: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? dflt : Number(v)))
    .pipe(z.number().positive());

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : v.trim()));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  PUBLIC_VERIFY_BASE_URL: optionalString,

  DATABASE_URL: z.string().min(1, 'DATABASE_URL مطلوب'),

  AUTH_SECRET: z.string().min(24, 'AUTH_SECRET يجب أن يكون 24 حرفًا على الأقل'),
  IP_HASH_SALT: z.string().min(8).default('athar-verify-default-ip-salt'),
  SESSION_TTL_HOURS: int(12),

  STORAGE_DRIVER: z.enum(['s3', 'r2', 'supabase', 'local']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./storage-data'),
  S3_BUCKET: optionalString,
  S3_REGION: z.string().default('auto'),
  S3_ENDPOINT: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_FORCE_PATH_STYLE: bool(true),
  S3_PRESIGN_EXPIRY_SECONDS: int(900),

  REDIS_URL: optionalString,
  QUEUE_PREFIX: z.string().default('athar-verify'),
  QUEUE_CONCURRENCY: int(2),

  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
  FRAME_SAMPLE_COUNT: int(64),
  FFMPEG_TIMEOUT_MS: int(120_000),

  MAX_UPLOAD_BYTES: num(1_073_741_824),
  MAX_CUSTOMER_UPLOAD_BYTES: num(314_572_800),

  AI_ANALYSIS_PROVIDER: z.enum(['mock', 'heuristic', 'http']).default('heuristic'),
  AI_ANALYSIS_API_URL: optionalString,
  AI_ANALYSIS_API_KEY: optionalString,
  AI_ANALYSIS_TIMEOUT_MS: int(30_000),

  RATE_LIMIT_LOOKUP_PER_MINUTE: int(10),
  RATE_LIMIT_UPLOAD_PER_HOUR: int(12),
  RATE_LIMIT_LOGIN_PER_15MIN: int(8),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`إعدادات البيئة غير صالحة:\n${issues}`);
  }

  const value = parsed.data;

  // Production hardening: refuse to boot with placeholder secrets.
  if (value.NODE_ENV === 'production') {
    if (value.AUTH_SECRET.includes('change-me')) {
      throw new Error('AUTH_SECRET ما زال على القيمة الافتراضية — غيّره قبل النشر.');
    }
    if (value.IP_HASH_SALT.includes('change-me') || value.IP_HASH_SALT.includes('default')) {
      throw new Error('IP_HASH_SALT ما زال على القيمة الافتراضية — غيّره قبل النشر.');
    }
    if (value.STORAGE_DRIVER === 'local') {
      // Local disk is not durable on most hosts; warn rather than crash so a
      // single-box docker-compose deployment (with a volume) still works.
      console.warn(
        '[athar-verify] تحذير: STORAGE_DRIVER=local في بيئة الإنتاج. تأكد من ربط مجلد دائم.',
      );
    }
  }

  if (value.STORAGE_DRIVER !== 'local') {
    const missing = (['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const).filter(
      (k) => !value[k],
    );
    if (missing.length) {
      throw new Error(
        `التخزين مضبوط على "${value.STORAGE_DRIVER}" لكن المتغيرات التالية ناقصة: ${missing.join(', ')}`,
      );
    }
  }

  if (value.AI_ANALYSIS_PROVIDER === 'http' && !value.AI_ANALYSIS_API_URL) {
    throw new Error('AI_ANALYSIS_PROVIDER=http يتطلب ضبط AI_ANALYSIS_API_URL.');
  }

  return value;
}

export function env(): Env {
  if (!cached) cached = load();
  return cached;
}

/** Base URL used to build public verification links and QR codes. */
export function publicVerifyBaseUrl(): string {
  const e = env();
  return (e.PUBLIC_VERIFY_BASE_URL ?? e.APP_URL).replace(/\/+$/, '');
}

export const isProd = () => env().NODE_ENV === 'production';
