"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { updateNotificationPreferencesAction } from "@/server/notifications/actions";

interface Prefs {
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  notifyPush: boolean;
  reminderAutoEnabled: boolean;
}

const ROWS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "notifyInApp", label: "داخل التطبيق", description: "إشعارات في مركز الإشعارات" },
  { key: "notifyEmail", label: "البريد الإلكتروني", description: "قريبًا — إشعارات عبر الإيميل" },
  { key: "notifySms", label: "رسائل SMS", description: "قريبًا — تنبيهات نصية" },
  { key: "notifyWhatsapp", label: "واتساب", description: "قريبًا — تنبيهات عبر واتساب" },
  { key: "notifyPush", label: "إشعارات فورية", description: "قريبًا — Push Notifications" },
  { key: "reminderAutoEnabled", label: "تذكيرات تلقائية", description: "تذكير تلقائي بالمطالبات المتأخرة" },
];

export function PreferencesForm({ defaultValues }: { defaultValues: Prefs }) {
  const [values, setValues] = useState(defaultValues);

  async function toggle(key: keyof Prefs) {
    const next = { ...values, [key]: !values[key] };
    setValues(next);
    const result = await updateNotificationPreferencesAction(next);
    if (!result.success) toast.error("حدث خطأ");
  }

  return (
    <div className="space-y-4">
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between">
          <div>
            <Label className="font-semibold">{row.label}</Label>
            <p className="text-xs text-muted-foreground">{row.description}</p>
          </div>
          <Switch checked={values[row.key]} onCheckedChange={() => toggle(row.key)} />
        </div>
      ))}
    </div>
  );
}
