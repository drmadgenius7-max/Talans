import { z } from "zod";

const saudiPhoneRegex = /^(?:\+?966|0)?5\d{8}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(saudiPhoneRegex, "رقم جوال غير صحيح (مثال: 05xxxxxxxx)");

export const emailSchema = z.string().trim().email("بريد إلكتروني غير صحيح");

export const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .regex(/[a-zA-Z]/, "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل")
  .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
    email: emailSchema.optional().or(z.literal("")),
    phone: phoneSchema.optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.email || data.phone, {
    message: "أدخل البريد الإلكتروني أو رقم الجوال",
    path: ["email"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "أدخل البريد الإلكتروني أو رقم الجوال"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, "أدخل البريد الإلكتروني أو رقم الجوال"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  defaultCurrency: z.string().length(3),
  country: z.string().length(2),
  locale: z.enum(["ar", "en"]),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export function isEmailLike(identifier: string): boolean {
  return identifier.includes("@");
}
