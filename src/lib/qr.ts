import QRCode from "qrcode";

export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    margin: 1,
    width: 320,
    color: { dark: "#175045", light: "#ffffff" },
  });
}
