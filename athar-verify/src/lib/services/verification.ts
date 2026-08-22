import type { Documentation } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { notFound, forbidden } from '@/lib/errors';
import { safeEqual, sha256Hex } from '@/lib/security/crypto';
import { enqueue, JobName } from '@/lib/queue';
import { presentOrder, type PublicOrder } from './presenters';

/**
 * Read paths for the two public entry points: order-number lookup and the QR
 * link. Both converge on the same presenter so the customer sees a consistent
 * page either way.
 */

/** Exactly what a browser is allowed to receive. */
export type PublicOrderPayload = {
  /** The documentation a customer upload is compared against. */
  primaryDocumentationId: string | null;
  order: PublicOrder;
  /** Whether a processed original exists that a customer file can be compared to. */
  comparisonAvailable: boolean;
};

/**
 * The server-side view. `orderId` is kept out of `payload` on purpose: the
 * customer-facing flows key off the order number, so the internal id has no
 * business reaching the browser or appearing in page source.
 */
export type PublicOrderView = {
  orderId: string;
  payload: PublicOrderPayload;
};

export async function loadOrderView(orderNumber: string): Promise<PublicOrderView | null> {
  const { findOrderForPublic } = await import('./orders');
  const order = await findOrderForPublic(orderNumber);
  if (!order) return null;

  const link = order.verificationLinks[0] ?? null;
  const primary = order.documentation.find((d) => d.kind === 'VIDEO') ?? null;

  return {
    orderId: order.id,
    payload: {
      primaryDocumentationId: primary?.id ?? null,
      order: presentOrder({
        order,
        documentation: order.documentation,
        link,
        token: link?.token ?? null,
      }),
      comparisonAvailable: primary != null,
    },
  };
}

/**
 * Resolves a QR/public link.
 *
 * Requires *both* the verification id and the matching token. The id alone is
 * short and quotable; the token is what actually authorises the read, and it is
 * compared in constant time against the stored hash.
 */
export async function loadVerificationLinkView(
  verificationId: string,
  token: string | null,
): Promise<PublicOrderView> {
  const link = await prisma.verificationLink.findUnique({
    where: { verificationId },
    include: {
      order: {
        include: {
          documentation: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
        },
      },
    },
  });

  if (!link || !link.order || link.order.deletedAt) throw notFound('رابط التحقق غير صالح.');
  if (!link.isActive) throw forbidden('تم إيقاف رابط التحقق هذا.');
  if (link.expiresAt && link.expiresAt < new Date()) throw forbidden('انتهت صلاحية رابط التحقق.');
  if (!token || !safeEqual(sha256Hex(token), link.tokenHash)) {
    throw notFound('رابط التحقق غير صالح.');
  }

  // Non-blocking view counter — a failure here must not break the page.
  void prisma.verificationLink
    .update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    })
    .catch(() => undefined);

  const primary = link.order.documentation.find((d) => d.kind === 'VIDEO') ?? null;

  return {
    orderId: link.order.id,
    payload: {
      primaryDocumentationId: primary?.id ?? null,
      order: presentOrder({
        order: link.order,
        documentation: link.order.documentation,
        link,
        token,
      }),
      comparisonAvailable: primary != null,
    },
  };
}

/** Authorises access to a documentation object from a public context. */
export async function authorizeDocumentationAccess(
  documentationId: string,
  token: string | null,
): Promise<Documentation> {
  const doc = await prisma.documentation.findFirst({
    where: { id: documentationId, deletedAt: null },
    include: {
      order: { include: { verificationLinks: { where: { isActive: true } } } },
    },
  });

  if (!doc || !doc.order || doc.order.deletedAt) throw notFound('الملف غير موجود.');

  // A valid link token for the owning order grants access. Without one, the
  // media stays private: object keys are never guessable and are never served
  // directly from storage.
  const authorized = doc.order.verificationLinks.some(
    (link) => token != null && safeEqual(sha256Hex(token), link.tokenHash),
  );
  if (!authorized) throw notFound('الملف غير موجود.');

  return doc;
}

/** Records a lookup so the dashboard can show verification activity. */
export async function recordLookup(input: {
  orderId: string | null;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    await prisma.verificationCheck.create({
      data: {
        orderId: input.orderId,
        source: 'LOOKUP',
        result: 'UNABLE_TO_VERIFY',
        processingStatus: 'READY',
        completedAt: new Date(),
        ipHash: input.ipHash,
        userAgent: input.userAgent,
      },
    });
  } catch {
    /* analytics only */
  }
}

/**
 * Creates a pending check row for an uploaded candidate file and schedules the
 * comparison job.
 *
 * The row is created *before* processing so the customer immediately gets an id
 * to poll, and so a crashed worker leaves a visible PENDING record rather than
 * a silently lost check.
 */
export async function startVerificationCheck(input: {
  orderId: string;
  documentationId: string;
  candidateKey: string;
  uploadedFilename: string;
  uploadedFileHash: string;
  uploadedFilesize: number;
  uploadedMimeType: string;
  source?: 'CUSTOMER_UPLOAD' | 'ADMIN_UPLOAD';
  ipHash: string | null;
  userAgent: string | null;
}): Promise<{ checkId: string; mode: 'queued' | 'inline' }> {
  const check = await prisma.verificationCheck.create({
    data: {
      orderId: input.orderId,
      documentationId: input.documentationId,
      source: input.source ?? 'CUSTOMER_UPLOAD',
      uploadedFilename: input.uploadedFilename,
      uploadedFileHash: input.uploadedFileHash,
      uploadedFilesize: BigInt(input.uploadedFilesize),
      uploadedMimeType: input.uploadedMimeType,
      processingStatus: 'PENDING',
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      reportJson: { candidateKey: input.candidateKey } as never,
    },
  });

  const { mode } = await enqueue(JobName.RunVerification, { checkId: check.id });
  return { checkId: check.id, mode };
}

export async function getCheckStatus(checkId: string) {
  const check = await prisma.verificationCheck.findUnique({
    where: { id: checkId },
    select: {
      id: true,
      processingStatus: true,
      result: true,
      confidenceScore: true,
      similarityScore: true,
      audioSimilarity: true,
      aiSignalScore: true,
      aiRiskLevel: true,
      hashMatch: true,
      reportJson: true,
      createdAt: true,
      completedAt: true,
      processingError: true,
    },
  });
  if (!check) throw notFound('عملية التحقق غير موجودة.');
  return check;
}
