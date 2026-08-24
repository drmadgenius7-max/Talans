"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPasswordAction } from "@/server/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import type { z } from "zod";

type Input = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token } });

  async function onSubmit(data: Input) {
    setServerError(null);
    const result = await resetPasswordAction(data);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ، حاول مرة أخرى");
      return;
    }
    toast.success("تم تحديث كلمة المرور، سجّل دخولك من جديد");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <input type="hidden" {...register("token")} />
      <div className="space-y-1.5">
        <Label htmlFor="password">كلمة المرور الجديدة</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" className="w-full" loading={isSubmitting}>
        تحديث كلمة المرور
      </Button>
    </form>
  );
}
