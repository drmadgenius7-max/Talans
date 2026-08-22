import QRCode from 'qrcode';
import { publicVerifyBaseUrl } from '@/lib/config/env';

/**
 * Public verification links and their QR codes.
 *
 * The link carries two parts: a readable verification id (ATH-XXXXXXXX) that
 * can be quoted in a support conversation, and an unguessable token. Both are
 * required — the id alone is short enough to be brute-forced, so the token is
 * what actually authorises access to a customer's documentation.
 */

export function buildVerificationUrl(verificationId: string, token: string): string {
  return `${publicVerifyBaseUrl()}/v/${encodeURIComponent(verificationId)}?t=${encodeURIComponent(token)}`;
}

/** Short display form used on printed certificates. */
export function buildVerificationDisplayUrl(verificationId: string): string {
  return `${publicVerifyBaseUrl().replace(/^https?:\/\//, '')}/v/${verificationId}`;
}

export type QrFormat = 'svg' | 'png';

export async function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#0f2e25', light: '#ffffff' },
  });
}

export async function renderQrPng(url: string, width = 640): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width,
    color: { dark: '#0f2e25', light: '#ffffff' },
  });
}

export async function renderQrDataUrl(url: string, width = 320): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width,
    color: { dark: '#0f2e25', light: '#ffffff' },
  });
}

/** Pre-filled WhatsApp share link for the customer's own verification page. */
export function buildWhatsappShareUrl(verificationUrl: string, orderNumber: string): string {
  const text = `توثيق طلب رقم ${orderNumber} من متجر أثر — تحقق من أصالة التوثيق عبر الرابط:\n${verificationUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
