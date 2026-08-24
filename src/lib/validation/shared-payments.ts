import { z } from "zod";

export const sharedPaymentParticipantInputSchema = z.object({
  userId: z.string().optional(),
  guestName: z.string().trim().optional(),
  guestContact: z.string().trim().optional(),
  targetShare: z.coerce.number().nonnegative().optional(),
});

export const createSharedPaymentSchema = z.object({
  title: z.string().trim().min(2, "أدخل عنوان العملية").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  targetAmount: z.coerce.number().positive("الهدف يجب أن يكون أكبر من صفر"),
  currency: z.string().length(3).default("SAR"),
  groupId: z.string().optional().or(z.literal("")),
  splitMethod: z.enum(["EQUAL", "CUSTOM", "PERCENTAGE", "OPEN"]),
  participants: z.array(sharedPaymentParticipantInputSchema).default([]),
  deadline: z.string().optional().or(z.literal("")),
  beneficiaryName: z.string().trim().optional().or(z.literal("")),
  beneficiaryContact: z.string().trim().optional().or(z.literal("")),
  externalOrderRef: z.string().trim().optional().or(z.literal("")),
  privacyShowNames: z.boolean().default(true),
  privacyShowAmounts: z.boolean().default(true),
  privacyShowTotal: z.boolean().default(true),
  allowOverfunding: z.boolean().default(false),
});

export type CreateSharedPaymentInput = z.infer<typeof createSharedPaymentSchema>;

export const contributeSchema = z.object({
  sharedPaymentToken: z.string(),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  isAnonymous: z.boolean().default(false),
  guestName: z.string().trim().optional().or(z.literal("")),
});
