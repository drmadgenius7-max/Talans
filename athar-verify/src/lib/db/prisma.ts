import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient per process. Next.js dev-mode hot reloading would
 * otherwise open a new connection pool on every edit.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }]
        : [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** JSON.stringify helper — Prisma returns BigInt for `filesize` columns. */
export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}
