import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getStorageProvider } from "@/server/storage/local-provider";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const file = await db.fileAsset.findUnique({
    where: { id: fileId },
    include: { expenseAttachments: { include: { expense: { select: { groupId: true } } } } },
  });
  if (!file) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  const relevantGroupIds = new Set<string>();
  if (file.groupId) relevantGroupIds.add(file.groupId);
  for (const att of file.expenseAttachments) relevantGroupIds.add(att.expense.groupId);

  let allowed = file.ownerUserId === user.id;
  if (!allowed && relevantGroupIds.size > 0) {
    const membership = await db.groupMember.findFirst({
      where: { userId: user.id, status: "ACTIVE", groupId: { in: [...relevantGroupIds] } },
    });
    allowed = Boolean(membership);
  }
  if (!allowed) return NextResponse.json({ error: "غير مصرح بالوصول لهذا الملف" }, { status: 403 });

  const storage = getStorageProvider();
  const buffer = await storage.read(file.storageKey);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
