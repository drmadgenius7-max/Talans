"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validation/groups";
import { createGroupAction } from "@/server/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GROUP_TYPE_LABELS_AR } from "@/lib/labels";
import { listCurrencies } from "@/lib/currency";
import { toast } from "@/components/ui/toaster";

export function NewGroupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { type: "OTHER", currency: "SAR", guestMembers: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "guestMembers" });

  async function onSubmit(data: CreateGroupInput) {
    setServerError(null);
    const result = await createGroupAction(data);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ، حاول مرة أخرى");
      return;
    }
    toast.success("تم إنشاء المجموعة 🎉");
    router.push(`/groups/${result.groupId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">اسم المجموعة</Label>
        <Input id="name" placeholder="رحلة البحرين" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>النوع</Label>
          <Select defaultValue="OTHER" onValueChange={(v) => setValue("type", v as CreateGroupInput["type"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GROUP_TYPE_LABELS_AR).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>العملة</Label>
          <Select defaultValue="SAR" onValueChange={(v) => setValue("currency", v)}>
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">الوصف (اختياري)</Label>
        <Textarea id="description" placeholder="وش القصة؟" {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">تاريخ البداية</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">تاريخ النهاية (اختياري)</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>أعضاء بدون حساب (ضيوف)</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", phone: "", email: "" })}>
            <Plus className="h-3.5 w-3.5" /> إضافة عضو
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          تقدر تضيف أشخاص حتى لو ما عندهم حساب في قِطّة، وبيقدرون يربطون مشاركاتهم لاحقًا.
        </p>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input placeholder="الاسم" {...register(`guestMembers.${index}.name`)} />
            <Input placeholder="الجوال (اختياري)" className="w-36" {...register(`guestMembers.${index}.phone`)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        إنشاء المجموعة
      </Button>
    </form>
  );
}
