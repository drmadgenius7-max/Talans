"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { requestPasswordResetAction } from "@/server/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

type Input = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: Input) {
    await requestPasswordResetAction(data);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="font-semibold">تم الإرسال، إذا كان الحساب موجودًا</p>
        <p className="text-sm text-muted-foreground">تحقق من بريدك أو رسائلك خلال دقائق.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="identifier">البريد الإلكتروني أو رقم الجوال</Label>
        <Input id="identifier" {...register("identifier")} />
        {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        إرسال رابط إعادة التعيين
      </Button>
    </form>
  );
}
