/**
 * Minimal structured logger.
 *
 * Emits one JSON object per line in production (friendly to log shippers) and
 * a compact human-readable line in development. Values that could carry PII
 * are expected to be redacted by the caller — see `hashIp`.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): number {
  const configured = (process.env.LOG_LEVEL as Level | undefined) ?? undefined;
  if (configured && configured in LEVEL_ORDER) return LEVEL_ORDER[configured];
  return process.env.NODE_ENV === 'production' ? LEVEL_ORDER.info : LEVEL_ORDER.debug;
}

const SENSITIVE_KEYS = /^(password|token|secret|authorization|cookie|apikey|api_key)$/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function emit(level: Level, msg: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < minLevel()) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  };
  const line =
    process.env.NODE_ENV === 'production'
      ? JSON.stringify(payload)
      : `${payload.ts} ${level.toUpperCase().padEnd(5)} ${msg}` +
        (context ? ` ${JSON.stringify(redact(context))}` : '');

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
  child: (base: Record<string, unknown>) => ({
    debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, { ...base, ...ctx }),
    info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, { ...base, ...ctx }),
    warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, { ...base, ...ctx }),
    error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, { ...base, ...ctx }),
  }),
};
