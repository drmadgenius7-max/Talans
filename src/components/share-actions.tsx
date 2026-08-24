"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Check, QrCode, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01a7.94 7.94 0 0 0 5.55-13.58ZM12.06 18.4h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.66.67-2.44-.16-.25a6.58 6.58 0 0 1 10.24-8.17 6.53 6.53 0 0 1 1.93 4.65 6.6 6.6 0 0 1-6.57 6.6Zm3.6-4.93c-.2-.1-1.17-.58-1.35-.64s-.31-.1-.44.1-.5.64-.62.77-.23.15-.43.05a5.4 5.4 0 0 1-2.7-2.36c-.2-.35.2-.32.58-1.08.06-.13.03-.24-.02-.34s-.44-1.06-.6-1.45c-.16-.38-.32-.33-.44-.34h-.38a.72.72 0 0 0-.53.25 2.2 2.2 0 0 0-.68 1.63 3.8 3.8 0 0 0 .8 2.03 8.7 8.7 0 0 0 3.33 2.95c.47.2.83.32 1.11.41.47.15.9.13 1.24.08.38-.06 1.17-.48 1.33-.94.17-.46.17-.85.12-.94s-.18-.14-.38-.24Z" />
  </svg>
);

export function ShareActions({
  url,
  message,
  qrDataUrl,
  title = "مشاركة الرابط",
}: {
  url: string;
  message: string;
  qrDataUrl?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("تم نسخ الرابط");
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
      } catch {
        // user cancelled — ignore
      }
    } else {
      await copyLink();
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message}\n${url}`)}`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon /> واتساب
        </a>
      </Button>
      <Button size="sm" variant="outline" onClick={copyLink}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "تم النسخ" : "نسخ الرابط"}
      </Button>
      {qrDataUrl && (
        <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4" /> QR
        </Button>
      )}
      <Button asChild size="sm" variant="outline">
        <a href={emailHref}>
          <Mail className="h-4 w-4" /> إيميل
        </a>
      </Button>
      <Button size="sm" variant="ghost" onClick={nativeShare}>
        مشاركة أخرى
      </Button>

      {qrDataUrl && (
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="max-w-xs text-center">
            <DialogHeader>
              <DialogTitle>امسح الرمز للفتح</DialogTitle>
            </DialogHeader>
            <Image src={qrDataUrl} alt="QR" width={280} height={280} className="mx-auto rounded-xl" unoptimized />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
