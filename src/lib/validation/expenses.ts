import { z } from "zod";

export const adjustmentTypeEnum = z.enum(["TAX", "VAT", "DISCOUNT", "DELIVERY", "SERVICE_CHARGE", "TIP", "OTHER"]);

export const expenseAdjustmentSchema = z.object({
  type: adjustmentTypeEnum,
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  isDiscount: z.boolean().default(false),
});

export const expensePayerSchema = z.object({
  groupMemberId: z.string(),
  amount: z.coerce.number().nonnegative(),
});

export const expenseItemSchema = z.object({
  name: z.string().trim().min(1, "أدخل اسم العنصر"),
  amount: z.coerce.number().positive(),
  participantIds: z.array(z.string()).min(1, "اختر مشارك واحد على الأقل"),
});

export const createExpenseSchema = z.object({
  groupId: z.string().min(1, "اختر مجموعة"),
  title: z.string().trim().min(1, "أدخل اسم المصروف").max(120),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  date: z.string().min(1),
  categoryId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES", "ITEMIZED"]),
  payers: z.array(expensePayerSchema).min(1, "حدد من دفع"),
  participantIds: z.array(z.string()).min(1, "اختر مشارك واحد على الأقل"),
  exactAmounts: z.record(z.string(), z.coerce.number()).optional(),
  percentages: z.record(z.string(), z.coerce.number()).optional(),
  shares: z.record(z.string(), z.coerce.number()).optional(),
  items: z.array(expenseItemSchema).optional(),
  adjustments: z.array(expenseAdjustmentSchema).default([]),
  autoCreatePaymentRequests: z.boolean().default(false),
  attachmentFileIds: z.array(z.string()).default([]),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
