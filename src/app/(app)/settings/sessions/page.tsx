import type { Metadata } from "next";
import { requireUser, listActiveSessions } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRelative } from "@/lib/time";
import { RevokeSessionButton } from "./revoke-session-button";

export const metadata: Metadata = { title: "إدارة الجلسات" };

export default async function SessionsPage() {
  const user = await requireUser();
  const sessions = await listActiveSessions(user.id);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">إدارة الجلسات</CardTitle>
          <CardDescription>الأجهزة المسجّل دخولها حاليًا على حسابك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-semibold">{s.userAgent?.slice(0, 50) ?? "جهاز غير معروف"}</p>
                <p className="text-xs text-muted-foreground">آخر نشاط {formatRelative(s.createdAt)}</p>
              </div>
              <RevokeSessionButton sessionId={s.id} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
