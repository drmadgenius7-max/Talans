import { z } from "zod";

export const groupTypeEnum = z.enum([
  "TRIP",
  "HOME",
  "FRIENDS",
  "RESTAURANT",
  "EVENT",
  "FAMILY",
  "HOUSING",
  "PROJECT",
  "OTHER",
]);

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "اسم المجموعة قصير جدًا").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  type: groupTypeEnum.default("OTHER"),
  currency: z.string().length(3).default("SAR"),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  guestMembers: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        phone: z.string().trim().optional().or(z.literal("")),
        email: z.string().trim().optional().or(z.literal("")),
      }),
    )
    .max(50)
    .default([]),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = createGroupSchema.omit({ guestMembers: true }).partial().extend({
  groupId: z.string(),
});

export const createInviteSchema = z.object({
  groupId: z.string(),
  type: z.enum(["LINK", "QR", "EMAIL", "PHONE"]).default("LINK"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  roleOnJoin: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
  expiresInDays: z.coerce.number().int().min(1).max(90).optional(),
});

export const addGuestMemberSchema = z.object({
  groupId: z.string(),
  name: z.string().trim().min(1, "أدخل الاسم"),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
});
