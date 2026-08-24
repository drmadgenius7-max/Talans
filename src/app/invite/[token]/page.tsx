import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AcceptInviteButton } from "./accept-invite-button";

export const metadata: Metadata = { title: "دعوة انضمام" };

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.groupInvite.findUnique({ where: { token }, include: { group: true, createdBy: true } });
  if (!invite) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const expired = invite.revokedAt || (invite.expiresAt && invite.expiresAt < new Date());

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 text-4xl">🐱</div>
          <CardTitle className="text-xl">دعوة للانضمام</CardTitle>
          <CardDescription>
            {invite.createdBy.name} يدعوك للانضمام إلى مجموعة <span className="font-bold text-foreground">{invite.group.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expired ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              انتهت صلاحية رابط الدعوة، اطلب رابطًا جديدًا.
            </p>
          ) : (
            <AcceptInviteButton token={token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
