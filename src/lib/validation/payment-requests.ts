import { z } from "zod";

export const createPaymentRequestSchema = z
  .object({
    payerUserId: z.string().optional().or(z.literal("")),
    payerGuestName: z.string().trim().optional().or(z.literal("")),
    payerGuestPhone: z.string().trim().optional().or(z.literal("")),
    amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
    currency: z.string().length(3).default("SAR"),
    reason: z.string().trim().min(1, "أدخل سبب المطالبة").max(120),
    note: z.string().trim().max(500).optional().or(z.literal("")),
    dueDate: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.payerUserId || data.payerGuestName, {
    message: "اختر شخص أو أدخل اسمه",
    path: ["payerGuestName"],
  });

export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
