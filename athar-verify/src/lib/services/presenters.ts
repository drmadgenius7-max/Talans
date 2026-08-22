import type { Documentation, Order, VerificationLink } from '@prisma/client';
import { countryLabel, ORDER_STATUS_AR } from '@/lib/i18n/countries';
import { publicTechnicalSummary, type VideoTechnicalMetadata } from '@/lib/media/ffprobe';
import { buildVerificationDisplayUrl, buildVerificationUrl, buildWhatsappShareUrl } from '@/lib/qr';
import { shortHash } from '@/lib/utils';

/**
 * Public presenters.
 *
 * Every field a customer sees passes through here. The rule is allow-listing,
 * not redaction: a new column on `Order` is invisible publicly until someone
 * deliberately adds it below. That is what keeps phone numbers, addresses, and
 * internal notes out of the public verification page by construction.
 */

export type PublicDocumentation = {
  id: string;
  kind: Documentation['kind'];
  /** Streamed through our own authenticated media route, never a raw storage URL. */
  streamPath: string;
  thumbnailPath: string | null;
  downloadPath: string | null;
  originalFilename: string;
  sha256: string;
  sha256Short: string;
  filesize: string;
  mimeType: string;
  durationSeconds: number | null;
  processingStatus: Documentation['processingStatus'];
  registeredAt: string;
  technical: ReturnType<typeof publicTechnicalSummary> | null;
};

export type PublicOrder = {
  orderNumber: string;
  /** Present only when the customer opted in. */
  customerName: string | null;
  country: string;
  countryCode: string;
  executionDate: string;
  status: Order['status'];
  statusAr: string;
  serviceType: string | null;
  documentation: PublicDocumentation[];
  verification: {
    verificationId: string;
    url: string;
    displayUrl: string;
    qrPath: string;
    whatsappShareUrl: string;
  } | null;
};

export function presentDocumentation(
  doc: Documentation,
  token: string | null,
): PublicDocumentation {
  const meta = (doc.metadataJson as { technical?: VideoTechnicalMetadata } | null) ?? null;
  const qs = token ? `?t=${encodeURIComponent(token)}` : '';

  return {
    id: doc.id,
    kind: doc.kind,
    streamPath: `/api/media/${doc.id}${qs}`,
    thumbnailPath: doc.thumbnailKey ? `/api/media/${doc.id}/thumbnail${qs}` : null,
    downloadPath: doc.downloadAllowed ? `/api/media/${doc.id}/download${qs}` : null,
    originalFilename: doc.originalFilename,
    sha256: doc.sha256,
    sha256Short: shortHash(doc.sha256),
    filesize: doc.filesize.toString(),
    mimeType: doc.mimeType,
    durationSeconds: doc.durationSeconds,
    processingStatus: doc.processingStatus,
    registeredAt: doc.createdAt.toISOString(),
    technical: meta?.technical ? publicTechnicalSummary(meta.technical) : null,
  };
}

export function presentOrder(input: {
  order: Order;
  documentation: Documentation[];
  link: VerificationLink | null;
  /** Include the link token in generated paths (public QR view only). */
  token?: string | null;
}): PublicOrder {
  const { order, documentation, link } = input;
  const token = input.token ?? null;

  return {
    orderNumber: order.orderNumber,
    customerName: order.showCustomerName ? order.customerName : null,
    country: countryLabel(order.countryCode, order.countryNameAr),
    countryCode: order.countryCode,
    executionDate: order.executionDate.toISOString(),
    status: order.status,
    statusAr: ORDER_STATUS_AR[order.status] ?? order.status,
    serviceType: order.serviceType,
    documentation: documentation.map((doc) => presentDocumentation(doc, token)),
    verification: link
      ? (() => {
          const url = buildVerificationUrl(link.verificationId, link.token);
          return {
            verificationId: link.verificationId,
            url,
            displayUrl: buildVerificationDisplayUrl(link.verificationId),
            qrPath: `/api/qr/${link.verificationId}?t=${encodeURIComponent(link.token)}`,
            whatsappShareUrl: buildWhatsappShareUrl(url, order.orderNumber),
          };
        })()
      : null,
  };
}
