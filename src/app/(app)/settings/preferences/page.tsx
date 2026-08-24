import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PreferencesForm } from "./preferences-form";

export const metadata: Metadata = { title: "إعدادات الإشعارات" };

export default async function PreferencesPage() {
  const user = await requireUser();
  const preference = await db.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">إعدادات الإشعارات</CardTitle>
          <CardDescription>اختر كيف تحب تستلم التنبيهات</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            defaultValues={{
              notifyInApp: preference.notifyInApp,
              notifyEmail: preference.notifyEmail,
              notifySms: preference.notifySms,
              notifyWhatsapp: preference.notifyWhatsapp,
              notifyPush: preference.notifyPush,
              reminderAutoEnabled: preference.reminderAutoEnabled,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
