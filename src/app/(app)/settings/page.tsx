import type { Metadata } from "next";
import Link from "next/link";
import { Bell, KeySquare, Trash2, Settings as SettingsIcon } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { DeleteAccountButton } from "./delete-account-button";

export const metadata: Metadata = { title: "حسابي" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">حسابي</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الملف الشخصي</CardTitle>
          <CardDescription>معلوماتك الأساسية والعملة الافتراضية</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={{
              name: user.name,
              email: user.email ?? "",
              phone: user.phone ?? "",
              defaultCurrency: user.defaultCurrency,
              country: user.country,
              locale: user.locale as "ar" | "en",
              avatarUrl: user.avatarUrl ?? "",
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-2">
        <SettingsLink href="/settings/preferences" icon={Bell} label="إعدادات الإشعارات" />
        <SettingsLink href="/settings/sessions" icon={KeySquare} label="إدارة الجلسات" />
        <SettingsLink href="/help" icon={SettingsIcon} label="مركز المساعدة" />
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" /> منطقة الخطر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsLink({ href, icon: Icon, label }: { href: string; icon: typeof Bell; label: string }) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-secondary">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{label}</span>
      </Card>
    </Link>
  );
}
