"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPaymentRequestSchema, type CreatePaymentRequestInput } from "@/lib/validation/payment-requests";
import { createPaymentRequestAction } from "@/server/payment-requests/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function NewPaymentRequestForm({
  knownUsers,
  defaultCurrency,
  defaultPayerUserId,
}: {
  knownUsers: { id: string; name: string; avatarUrl: string | null }[];
  defaultCurrency: string;
  defaultPayerUserId?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [personMode, setPersonMode] = useState<"known" | "guest">(knownUsers.length > 0 ? "known" : "guest");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePaymentRequestInput>({
    resolver: zodResolver(createPaymentRequestSchema),
    defaultValues: { currency: defaultCurrency, payerUserId: defaultPayerUserId },
  });

  async function onSubmit(data: CreatePaymentRequestInput) {
    setServerError(null);
    const result = await createPaymentRequestAction(data);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ، حاول مرة أخرى");
      return;
    }
    router.push(`/pay/${result.token}?created=1`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {knownUsers.length > 0 && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={personMode === "known" ? "default" : "outline"} onClick={() => setPersonMode("known")}>
            من أصحابي
          </Button>
          <Button type="button" size="sm" variant={personMode === "guest" ? "default" : "outline"} onClick={() => setPersonMode("guest")}>
            شخص جديد
          </Button>
        </div>
      )}

      {personMode === "known" ? (
        <div className="space-y-1.5">
          <Label>الشخص</Label>
          <Select defaultValue={defaultPayerUserId} onValueChange={(v) => setValue("payerUserId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر شخص" />
            </SelectTrigger>
            <SelectContent>
              {knownUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  <span className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">{u.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    {u.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="payerGuestName">الاسم</Label>
            <Input id="payerGuestName" placeholder="اسم الشخص" {...register("payerGuestName")} />
            {errors.payerGuestName && <p className="text-xs text-destructive">{errors.payerGuestName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payerGuestPhone">الجوال (اختياري)</Label>
            <Input id="payerGuestPhone" placeholder="05xxxxxxxx" {...register("payerGuestPhone")} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">المبلغ</Label>
          <Input id="amount" inputMode="decimal" placeholder="0.00" {...register("amount")} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>العملة</Label>
          <Select defaultValue={defaultCurrency} onValueChange={(v) => setValue("currency", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAR">SAR</SelectItem>
              <SelectItem value="AED">AED</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="KWD">KWD</SelectItem>
              <SelectItem value="BHD">BHD</SelectItem>
              <SelectItem value="QAR">QAR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">السبب</Label>
        <Input id="reason" placeholder="عشاء الجمعة" {...register("reason")} />
        {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">تاريخ الاستحقاق (اختياري)</Label>
        <Input id="dueDate" type="date" {...register("dueDate")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">ملاحظة (اختياري)</Label>
        <Textarea id="note" {...register("note")} />
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        إنشاء المطالبة
      </Button>
    </form>
  );
}
