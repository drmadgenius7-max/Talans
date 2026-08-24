"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@/lib/validation/auth";
import { updateProfileAction } from "@/server/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { listCurrencies } from "@/lib/currency";
import type { z } from "zod";

type ProfileInput = z.infer<typeof updateProfileSchema>;

export function ProfileForm({ defaultValues }: { defaultValues: ProfileInput }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({ resolver: zodResolver(updateProfileSchema), defaultValues });

  async function onSubmit(data: ProfileInput) {
    setServerError(null);
    const result = await updateProfileAction(data);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ");
      return;
    }
    toast.success("تم حفظ التغييرات");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">الاسم</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone">الجوال</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input id="email" type="email" {...register("email")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>العملة الافتراضية</Label>
          <Select defaultValue={defaultValues.defaultCurrency} onValueChange={(v) => setValue("defaultCurrency", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {listCurrencies().map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>اللغة</Label>
          <Select defaultValue={defaultValues.locale} onValueChange={(v) => setValue("locale", v as "ar" | "en")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English (قريبًا)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" loading={isSubmitting}>
        حفظ التغييرات
      </Button>
    </form>
  );
}
