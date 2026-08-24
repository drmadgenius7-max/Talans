"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toaster";
import { createExpenseAction } from "@/server/expenses/actions";
import {
  equalSplit,
  exactSplit,
  percentageSplit,
  sharesSplit,
  itemizedSplit,
  distributeAdjustment,
  sumMap,
  SplitValidationError,
} from "@/server/split/split-engine";
import { toMinorUnits, toDecimalString, formatMoney } from "@/lib/money";
import { ADJUSTMENT_TYPE_LABELS_AR } from "@/lib/labels";

type Member = { id: string; userId: string | null; name: string; avatarUrl: string | null };
type Group = { id: string; name: string; currency: string; myMemberId: string; members: Member[] };
type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES" | "ITEMIZED";
type AdjustmentType = keyof typeof ADJUSTMENT_TYPE_LABELS_AR;

interface Item {
  name: string;
  amount: string;
  participantIds: string[];
}
interface Adjustment {
  type: AdjustmentType;
  amount: string;
  isDiscount: boolean;
}

export function ExpenseForm({
  groups,
  categories,
  initialGroupId,
  paidForThemMode,
}: {
  groups: Group[];
  categories: { id: string; label: string }[];
  initialGroupId?: string;
  paidForThemMode: boolean;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(initialGroupId && groups.some((g) => g.id === initialGroupId) ? initialGroupId : groups[0]!.id);
  const group = groups.find((g) => g.id === groupId)!;
  const myMemberId = group.myMemberId;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [multiPayer, setMultiPayer] = useState(false);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({ [myMemberId]: "" });

  const [participantIds, setParticipantIds] = useState<string[]>(group.members.map((m) => m.id));
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[]>([{ name: "", amount: "", participantIds: [] }]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [autoRequest, setAutoRequest] = useState(paidForThemMode);

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onGroupChange(newGroupId: string) {
    const newGroup = groups.find((g) => g.id === newGroupId)!;
    setGroupId(newGroupId);
    setParticipantIds(newGroup.members.map((m) => m.id));
    setPayerAmounts({ [newGroup.myMemberId]: "" });
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const baseAmountMinor = useMemo(() => {
    if (splitType === "ITEMIZED") {
      return items.reduce((sum, item) => sum + (Number(item.amount) > 0 ? toMinorUnits(item.amount || "0", group.currency) : 0), 0);
    }
    return amount ? toMinorUnits(amount || "0", group.currency) : 0;
  }, [amount, items, splitType, group.currency]);

  const preview = useMemo(() => {
    try {
      let baseOwed: Map<string, number>;
      if (splitType === "EQUAL") {
        if (participantIds.length === 0) return null;
        baseOwed = equalSplit(baseAmountMinor, participantIds);
      } else if (splitType === "EXACT") {
        baseOwed = exactSplit(
          participantIds.map((id) => ({ participantId: id, amountMinor: toMinorUnits(exactAmounts[id] || "0", group.currency) })),
          baseAmountMinor,
        );
      } else if (splitType === "PERCENTAGE") {
        baseOwed = percentageSplit(
          baseAmountMinor,
          participantIds.map((id) => ({ participantId: id, percentage: Number(percentages[id] || 0) })),
        );
      } else if (splitType === "SHARES") {
        baseOwed = sharesSplit(
          baseAmountMinor,
          participantIds.map((id) => ({ participantId: id, shares: Number(shares[id] || 0) })),
        );
      } else {
        const validItems = items.filter((i) => i.name && Number(i.amount) > 0 && i.participantIds.length > 0);
        if (validItems.length === 0) return null;
        baseOwed = itemizedSplit(validItems.map((i, idx) => ({ itemId: String(idx), amountMinor: toMinorUnits(i.amount, group.currency), participantIds: i.participantIds })));
      }

      let finalOwed = baseOwed;
      for (const adj of adjustments) {
        const adjMinor = toMinorUnits(adj.amount || "0", group.currency);
        if (adjMinor > 0) finalOwed = distributeAdjustment(finalOwed, adj.isDiscount ? -adjMinor : adjMinor);
      }
      return { map: finalOwed, total: sumMap(finalOwed) };
    } catch (err) {
      return { error: err instanceof SplitValidationError ? err.message : "خطأ في حساب التقسيم" };
    }
  }, [splitType, participantIds, baseAmountMinor, exactAmounts, percentages, shares, items, adjustments, group.currency]);

  function addItem() {
    setItems((prev) => [...prev, { name: "", amount: "", participantIds: [] }]);
  }
  function addAdjustment() {
    setAdjustments((prev) => [...prev, { type: "TAX", amount: "", isDiscount: false }]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!title.trim()) return setServerError("أدخل اسم المصروف");
    if (participantIds.length === 0) return setServerError("اختر مشارك واحد على الأقل");
    if (!preview || "error" in preview) return setServerError(preview?.error ?? "تحقق من بيانات التقسيم");

    const payers = multiPayer
      ? Object.entries(payerAmounts)
          .filter(([, v]) => Number(v) > 0)
          .map(([groupMemberId, v]) => ({ groupMemberId, amount: Number(v) }))
      : [{ groupMemberId: myMemberId, amount: Number(toDecimalString(preview.total, group.currency)) }];

    if (payers.length === 0) return setServerError("حدد من دفع");

    setSubmitting(true);
    const result = await createExpenseAction({
      groupId,
      title,
      amount: splitType === "ITEMIZED" ? Number(toDecimalString(baseAmountMinor, group.currency)) : Number(amount || 0),
      date,
      categoryId: categoryId || undefined,
      notes: notes || undefined,
      splitType,
      payers,
      participantIds,
      exactAmounts: splitType === "EXACT" ? Object.fromEntries(Object.entries(exactAmounts).map(([k, v]) => [k, Number(v || 0)])) : undefined,
      percentages: splitType === "PERCENTAGE" ? Object.fromEntries(Object.entries(percentages).map(([k, v]) => [k, Number(v || 0)])) : undefined,
      shares: splitType === "SHARES" ? Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, Number(v || 0)])) : undefined,
      items:
        splitType === "ITEMIZED"
          ? items.filter((i) => i.name && Number(i.amount) > 0 && i.participantIds.length > 0).map((i) => ({ name: i.name, amount: Number(i.amount), participantIds: i.participantIds }))
          : undefined,
      adjustments: adjustments.filter((a) => Number(a.amount) > 0).map((a) => ({ type: a.type, amount: Number(a.amount), isDiscount: a.isDiscount })),
      autoCreatePaymentRequests: autoRequest,
      attachmentFileIds: [],
    });
    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ، حاول مرة أخرى");
      return;
    }
    toast.success("تمت إضافة المصروف");
    router.push(`/groups/${groupId}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <Label>المجموعة</Label>
        <Select value={groupId} onValueChange={onGroupChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="title">اسم المصروف</Label>
          <Input id="title" placeholder="العشاء" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        {splitType !== "ITEMIZED" && (
          <div className="space-y-1.5">
            <Label htmlFor="amount">المبلغ ({group.currency})</Label>
            <Input id="amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="date">التاريخ</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>الفئة</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر فئة (اختياري)" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!paidForThemMode && (
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-semibold">أكثر من شخص دفع؟</p>
            <p className="text-xs text-muted-foreground">فعّلها إذا اشترك أكثر من شخص في الدفع</p>
          </div>
          <Switch checked={multiPayer} onCheckedChange={setMultiPayer} />
        </div>
      )}

      {multiPayer && !paidForThemMode && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">من دفع؟</p>
          {group.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <MemberLabel member={m} />
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className="w-28"
                value={payerAmounts[m.id] ?? ""}
                onChange={(e) => setPayerAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>على من المصروف؟</Label>
        <div className="grid grid-cols-2 gap-2">
          {group.members.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary-50"
            >
              <Checkbox checked={participantIds.includes(m.id)} onCheckedChange={() => toggleParticipant(m.id)} />
              <MemberLabel member={m} />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>طريقة التقسيم</Label>
        <Tabs value={splitType} onValueChange={(v) => setSplitType(v as SplitType)} dir="rtl">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="EQUAL">تساوي</TabsTrigger>
            <TabsTrigger value="EXACT">مبلغ</TabsTrigger>
            <TabsTrigger value="PERCENTAGE">نسبة</TabsTrigger>
            <TabsTrigger value="SHARES">حصص</TabsTrigger>
            <TabsTrigger value="ITEMIZED">عناصر</TabsTrigger>
          </TabsList>

          <TabsContent value="EQUAL">
            <p className="text-sm text-muted-foreground">بيتم تقسيم المبلغ بالتساوي بين {participantIds.length} أشخاص.</p>
          </TabsContent>

          <TabsContent value="EXACT" className="space-y-2">
            {participantIds.map((id) => {
              const m = group.members.find((mm) => mm.id === id)!;
              return (
                <div key={id} className="flex items-center gap-2">
                  <MemberLabel member={m} className="flex-1" />
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-28"
                    value={exactAmounts[id] ?? ""}
                    onChange={(e) => setExactAmounts((prev) => ({ ...prev, [id]: e.target.value }))}
                  />
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="PERCENTAGE" className="space-y-2">
            {participantIds.map((id) => {
              const m = group.members.find((mm) => mm.id === id)!;
              return (
                <div key={id} className="flex items-center gap-2">
                  <MemberLabel member={m} className="flex-1" />
                  <div className="relative w-28">
                    <Input
                      inputMode="decimal"
                      placeholder="0"
                      value={percentages[id] ?? ""}
                      onChange={(e) => setPercentages((prev) => ({ ...prev, [id]: e.target.value }))}
                    />
                    <span className="absolute inset-y-0 start-3 flex items-center text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="SHARES" className="space-y-2">
            {participantIds.map((id) => {
              const m = group.members.find((mm) => mm.id === id)!;
              return (
                <div key={id} className="flex items-center gap-2">
                  <MemberLabel member={m} className="flex-1" />
                  <Input
                    inputMode="numeric"
                    placeholder="1"
                    className="w-24"
                    value={shares[id] ?? ""}
                    onChange={(e) => setShares((prev) => ({ ...prev, [id]: e.target.value }))}
                  />
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="ITEMIZED" className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="اسم العنصر (مثال: برجر)"
                    value={item.name}
                    onChange={(e) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it)))}
                  />
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-24"
                    value={item.amount}
                    onChange={(e) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, amount: e.target.value } : it)))}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {participantIds.map((pid) => {
                    const m = group.members.find((mm) => mm.id === pid)!;
                    const checked = item.participantIds.includes(pid);
                    return (
                      <button
                        type="button"
                        key={pid}
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? { ...it, participantIds: checked ? it.participantIds.filter((x) => x !== pid) : [...it.participantIds, pid] }
                                : it,
                            ),
                          )
                        }
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${checked ? "border-primary bg-primary-100 text-primary-800" : "border-border text-muted-foreground"}`}
                      >
                        {checked && <Check className="h-3 w-3" />} {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> إضافة عنصر
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>إضافات (ضريبة، خصم، توصيل...)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addAdjustment}>
            <Plus className="h-3.5 w-3.5" /> إضافة
          </Button>
        </div>
        {adjustments.map((adj, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Select value={adj.type} onValueChange={(v) => setAdjustments((prev) => prev.map((a, i) => (i === idx ? { ...a, type: v as AdjustmentType } : a)))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ADJUSTMENT_TYPE_LABELS_AR).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              className="w-28"
              value={adj.amount}
              onChange={(e) => setAdjustments((prev) => prev.map((a, i) => (i === idx ? { ...a, amount: e.target.value } : a)))}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox
                checked={adj.isDiscount}
                onCheckedChange={(c) => setAdjustments((prev) => prev.map((a, i) => (i === idx ? { ...a, isDiscount: Boolean(c) } : a)))}
              />
              خصم
            </label>
            <Button type="button" variant="ghost" size="icon" onClick={() => setAdjustments((prev) => prev.filter((_, i) => i !== idx))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">ملاحظات (اختياري)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {paidForThemMode && (
        <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 p-3">
          <div>
            <p className="text-sm font-semibold">إنشاء مطالبات تلقائيًا</p>
            <p className="text-xs text-muted-foreground">بنرسل لكل شخص رابط دفع لحصته</p>
          </div>
          <Switch checked={autoRequest} onCheckedChange={setAutoRequest} />
        </div>
      )}

      {preview && !("error" in preview) && (
        <div className="space-y-1.5 rounded-xl bg-secondary p-3">
          <p className="text-sm font-bold">معاينة التقسيم</p>
          {[...preview.map.entries()].map(([id, owed]) => {
            const m = group.members.find((mm) => mm.id === id);
            if (!m) return null;
            return (
              <div key={id} className="flex items-center justify-between text-sm">
                <span>{m.name}</span>
                <span className="font-semibold">{formatMoney(owed, group.currency)}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-bold">
            <span>الإجمالي</span>
            <span>{formatMoney(preview.total, group.currency)}</span>
          </div>
        </div>
      )}
      {preview && "error" in preview && <p className="text-sm text-destructive">{preview.error}</p>}

      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" loading={submitting}>
        حفظ المصروف
      </Button>
    </form>
  );
}

function MemberLabel({ member, className }: { member: Member; className?: string }) {
  return (
    <span className={`flex items-center gap-2 text-sm ${className ?? ""}`}>
      <Avatar className="h-6 w-6">
        <AvatarImage src={member.avatarUrl ?? undefined} />
        <AvatarFallback className="text-[10px]">{member.name.slice(0, 1)}</AvatarFallback>
      </Avatar>
      {member.name}
    </span>
  );
}
