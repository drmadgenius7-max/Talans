import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import { requireMembership } from "@/server/groups/actions";
import { assertPermission } from "@/server/groups/permissions";
import { generateSecureToken } from "@/lib/tokens";
import { generateQrDataUrl } from "@/lib/qr";
import { env } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShareActions } from "@/components/share-actions";
import { AddGuestForm } from "@/components/groups/add-guest-form";

export const metadata: Metadata = { title: "دعوة أعضاء" };

export default async function InviteGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) notFound();

  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "INVITE_MEMBERS");

  let invite = await db.groupInvite.findFirst({
    where: { groupId, type: "LINK", revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!invite) {
    invite = await db.groupInvite.create({
      data: { groupId, token: generateSecureToken(24), type: "LINK", createdById: user.id },
    });
  }

  const inviteUrl = `${env.appUrl}/invite/${invite.token}`;
  const qrDataUrl = await generateQrDataUrl(inviteUrl);
  const message = `هلا! انضم معي في مجموعة "${group.name}" على قِطّة لنقسّم مصاريفنا بسهولة 🐱`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>دعوة أعضاء إلى {group.name}</CardTitle>
          <CardDescription>شارك الرابط أو رمز QR مع أي شخص</CardDescription>
        </CardHeader>
        <CardContent>
          <ShareActions url={inviteUrl} message={message} qrDataUrl={qrDataUrl} title="دعوة إلى قِطّة" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إضافة عضو بدون حساب</CardTitle>
          <CardDescription>يقدر يربط حسابه لاحقًا لما يسجّل في قِطّة</CardDescription>
        </CardHeader>
        <CardContent>
          <AddGuestForm groupId={groupId} />
        </CardContent>
      </Card>
    </div>
  );
}
