"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addGuestMemberSchema } from "@/lib/validation/groups";
import { addGuestMemberAction } from "@/server/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import type { z } from "zod";

type Input = z.infer<typeof addGuestMemberSchema>;

export function AddGuestForm({ groupId }: { groupId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(addGuestMemberSchema), defaultValues: { groupId } });

  async function onSubmit(data: Input) {
    setServerError(null);
    const result = await addGuestMemberAction(data);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ");
      return;
    }
    toast.success("تمت إضافة العضو");
    reset({ groupId, name: "", phone: "", email: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2" noValidate>
      <input type="hidden" {...register("groupId")} />
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="guest-name">الاسم</Label>
        <Input id="guest-name" placeholder="اسم الشخص" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="guest-phone">الجوال (اختياري)</Label>
        <Input id="guest-phone" placeholder="05xxxxxxxx" {...register("phone")} />
      </div>
      <Button type="submit" loading={isSubmitting}>
        إضافة
      </Button>
      {serverError && <p className="text-xs text-destructive">{serverError}</p>}
    </form>
  );
}
