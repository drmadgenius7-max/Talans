"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { createSharedPaymentAction } from "@/server/shared-payments/actions";
import { toMinorUnits, formatMoney } from "@/lib/money";
import { allocateEqual, allocateByWeights } from "@/lib/money";

type SplitMethod = "EQUAL" | "CUSTOM" | "PERCENTAGE" | "OPEN";
interface ParticipantRow {
  key: string;
  userId?: string;
  guestName: string;
  value: string; // custom amount or percentage, depending on method
}

export function NewSharedPaymentForm({
  knownUsers,
  defaultCurrency,
}: {
  knownUsers: { id: string; name: string; avatarUrl: string | null }[];
  defaultCurrency: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [deadline, setDeadline] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("EQUAL");
  const [participants, setParticipants] = useState<ParticipantRow[]>([
    { key: crypto.randomUUID(), guestName: "", value: "" },
  ]);
  const [privacyShowNames, setPrivacyShowNames] = useState(true);
  const [privacyShowAmounts, setPrivacyShowAmounts] = useState(true);
  const [allowOverfunding, setAllowOverfunding] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addParticipant() {
    setParticipants((prev) => [...prev, { key: crypto.randomUUID(), guestName: "", value: "" }]);
  }

  const targetMinor = targetAmount ? toMinorUnits(targetAmount || "0", currency) : 0;

  const preview = useMemo(() => {
    if (splitMethod === "OPEN" || targetMinor <= 0) return null;
    const names = participants.map((p) => p.userId ? knownUsers.find((u) => u.id === p.userId)?.name ?? "؟" : p.guestName || "؟");
    if (splitMethod === "EQUAL") {
      if (participants.length === 0) return null;
      return names.map((name, i) => ({ name, share: allocateEqual(targetMinor, participants.length)[i]! }));
    }
    if (splitMethod === "CUSTOM") {
      return names.map((name, i) => ({ name, share: toMinorUnits(participants[i]!.value || "0", currency) }));
    }
    // PERCENTAGE
    const weights = participants.map((p) => Number(p.value || 0));
    if (weights.every((w) => w === 0)) return null;
    const shares = allocateByWeights(targetMinor, weights.map((w) => w || 0.0001));
    return names.map((name, i) => ({ name, share: shares[i]! }));
  }, [splitMethod, participants, targetMinor, currency, knownUsers]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!title.trim()) return setServerError("أدخل عنوان العملية");
    if (!targetAmount || Number(targetAmount) <= 0) return setServerError("أدخل الهدف");
    if (splitMethod !== "OPEN" && participants.length === 0) return setServerError("أضف مشاركين");

    setSubmitting(true);
    const result = await createSharedPaymentAction({
      title,
      description: description || undefined,
      targetAmount: Number(targetAmount),
      currency,
      splitMethod,
      participants:
        splitMethod === "OPEN"
          ? []
          : participants.map((p) => ({
              userId: p.userId,
              guestName: p.userId ? undefined : p.guestName,
              targetShare: splitMethod === "CUSTOM" || splitMethod === "PERCENTAGE" ? Number(p.value || 0) : undefined,
            })),
      deadline: deadline || undefined,
      beneficiaryName: beneficiaryName || undefined,
      privacyShowNames,
      privacyShowAmounts,
      privacyShowTotal: true,
      allowOverfunding,
    });
    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ، حاول مرة أخرى");
      return;
    }
    toast.success("تم إنشاء القِطّة 🎉");
    router.push(`/qitta/${result.token}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="title">عنوان العملية</Label>
        <Input id="title" placeholder="هدية الوالدة" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">الوصف (اختياري)</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="targetAmount">الهدف</Label>
          <Input id="targetAmount" inputMode="decimal" placeholder="0.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>العملة</Label>
          <Select value={currency} onValueChange={setCurrency}>
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
        <Label htmlFor="deadline">المهلة (اختياري)</Label>
        <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="beneficiaryName">المستفيد النهائي (اختياري)</Label>
        <Input id="beneficiaryName" placeholder="اسم التاجر أو المستفيد" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} />
      </div>

      <div className="space-y-3">
        <Label>طريقة التقسيم</Label>
        <Tabs value={splitMethod} onValueChange={(v) => setSplitMethod(v as SplitMethod)} dir="rtl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="EQUAL">بالتساوي</TabsTrigger>
            <TabsTrigger value="CUSTOM">مبلغ مخصص</TabsTrigger>
            <TabsTrigger value="PERCENTAGE">نسبة</TabsTrigger>
            <TabsTrigger value="OPEN">مفتوحة</TabsTrigger>
          </TabsList>

          <TabsContent value="OPEN">
            <p className="text-sm text-muted-foreground">أي شخص يقدر يساهم بأي مبلغ يختاره من رابط عام.</p>
          </TabsContent>

          {(["EQUAL", "CUSTOM", "PERCENTAGE"] as const).map((method) => (
            <TabsContent key={method} value={method} className="space-y-2">
              {participants.map((p, idx) => (
                <div key={p.key} className="flex items-center gap-2">
                  <Select
                    value={p.userId ?? "guest"}
                    onValueChange={(v) =>
                      setParticipants((prev) => prev.map((row, i) => (i === idx ? { ...row, userId: v === "guest" ? undefined : v } : row)))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest">شخص جديد</SelectItem>
                      {knownUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!p.userId && (
                    <Input
                      placeholder="الاسم"
                      className="flex-1"
                      value={p.guestName}
                      onChange={(e) => setParticipants((prev) => prev.map((row, i) => (i === idx ? { ...row, guestName: e.target.value } : row)))}
                    />
                  )}
                  {method !== "EQUAL" && (
                    <Input
                      inputMode="decimal"
                      placeholder={method === "PERCENTAGE" ? "%" : "0.00"}
                      className="w-24"
                      value={p.value}
                      onChange={(e) => setParticipants((prev) => prev.map((row, i) => (i === idx ? { ...row, value: e.target.value } : row)))}
                    />
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => setParticipants((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                <Plus className="h-3.5 w-3.5" /> إضافة مشارك
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {preview && (
        <div className="space-y-1 rounded-xl bg-secondary p-3 text-sm">
          {preview.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span>{p.name}</span>
              <span className="font-semibold">{formatMoney(p.share, currency)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-sm font-bold">الخصوصية</p>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-normal">عرض أسماء المساهمين</Label>
          <Switch checked={privacyShowNames} onCheckedChange={setPrivacyShowNames} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-normal">عرض مبالغ المساهمات</Label>
          <Switch checked={privacyShowAmounts} onCheckedChange={setPrivacyShowAmounts} />
        </div>
        {splitMethod === "OPEN" && (
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">السماح بتجاوز الهدف</Label>
            <Switch checked={allowOverfunding} onCheckedChange={setAllowOverfunding} />
          </div>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" loading={submitting}>
        إنشاء القِطّة
      </Button>
    </form>
  );
}
