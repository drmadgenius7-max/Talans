"use server";

import { z } from "zod";
import { mockEmailProvider } from "@/server/notifications/providers/mock-providers";
import { checkRateLimit, getRequestIp } from "@/server/security/rate-limit";
import type { ActionResult } from "@/server/auth/actions";

const contactSchema = z.object({
  name: z.string().trim().min(2, "أدخل اسمك"),
  email: z.string().trim().email("بريد إلكتروني غير صحيح"),
  message: z.string().trim().min(10, "الرسالة قصيرة جدًا").max(2000),
});

export async function submitContactFormAction(input: unknown): Promise<ActionResult> {
  const ip = await getRequestIp();
  if (!checkRateLimit(`contact:${ip}`, 5, 3600).allowed) {
    return { success: false, error: "محاولات كثيرة جدًا، حاول مرة أخرى بعد قليل" };
  }

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  await mockEmailProvider.send({
    to: "support@qitta.sa",
    subject: `رسالة تواصل جديدة من ${parsed.data.name}`,
    body: `من: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
  });

  return { success: true };
}
