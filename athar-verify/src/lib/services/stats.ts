import { prisma } from '@/lib/db/prisma';

/**
 * Dashboard counters.
 *
 * Shared by the admin API route and the dashboard server component so both
 * always report the same numbers.
 */
export async function collectStats() {
  const since30 = new Date(Date.now() - 30 * 24 * 3600_000);

  const [
    orders,
    ordersThisMonth,
    documentation,
    processingPending,
    processingFailed,
    checksTotal,
    checksByResult,
    uploadsTotal,
    lookupsTotal,
    recentChecks,
  ] = await Promise.all([
    prisma.order.count({ where: { deletedAt: null } }),
    prisma.order.count({ where: { deletedAt: null, createdAt: { gte: since30 } } }),
    prisma.documentation.count({ where: { deletedAt: null } }),
    prisma.documentation.count({
      where: { deletedAt: null, processingStatus: { in: ['PENDING', 'PROCESSING'] } },
    }),
    prisma.documentation.count({ where: { deletedAt: null, processingStatus: 'FAILED' } }),
    prisma.verificationCheck.count(),
    prisma.verificationCheck.groupBy({
      by: ['result'],
      _count: { _all: true },
      where: { source: { not: 'LOOKUP' } },
    }),
    prisma.verificationCheck.count({ where: { source: { not: 'LOOKUP' } } }),
    prisma.verificationCheck.count({ where: { source: 'LOOKUP' } }),
    prisma.verificationCheck.findMany({
      where: { source: { not: 'LOOKUP' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { order: { select: { orderNumber: true, countryCode: true } } },
    }),
  ]);

  const byResult = Object.fromEntries(
    checksByResult.map((row) => [row.result, row._count._all]),
  ) as Record<string, number>;

  return {
    orders,
    ordersThisMonth,
    documentation,
    processingPending,
    processingFailed,
    checksTotal,
    uploadsTotal,
    lookupsTotal,
    matched: (byResult.VERIFIED_ORIGINAL ?? 0) + (byResult.VERIFIED_CONTENT_MATCH ?? 0),
    hashMatched: byResult.VERIFIED_ORIGINAL ?? 0,
    contentMatched: byResult.VERIFIED_CONTENT_MATCH ?? 0,
    unableToVerify: byResult.UNABLE_TO_VERIFY ?? 0,
    noMatch: byResult.NO_MATCH ?? 0,
    errored: byResult.ERROR ?? 0,
    recentChecks: recentChecks.map((check) => ({
      id: check.id,
      result: check.result,
      status: check.processingStatus,
      confidenceScore: check.confidenceScore,
      similarityScore: check.similarityScore,
      source: check.source,
      orderNumber: check.order?.orderNumber ?? null,
      countryCode: check.order?.countryCode ?? null,
      createdAt: check.createdAt.toISOString(),
    })),
  };
}
