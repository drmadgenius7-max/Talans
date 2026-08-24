import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getStorageProvider } from "@/server/storage/local-provider";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "RECEIPT");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم (صور أو PDF فقط)" }, { status: 400 });
  }
  if (file.size > env.storageMaxUploadBytes) {
    return NextResponse.json({ error: "حجم الملف كبير جدًا" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "الملف فارغ" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageProvider();
  const { storageKey } = await storage.save({ buffer, originalName: file.name, mimeType: file.type });

  const fileAsset = await db.fileAsset.create({
    data: {
      ownerUserId: user.id,
      kind: kind === "RECEIPT" ? "RECEIPT" : "OTHER",
      originalName: file.name.slice(0, 200),
      mimeType: file.type,
      sizeBytes: file.size,
      storageProvider: storage.name,
      storageKey,
      url: "",
    },
  });

  const url = `/api/files/${fileAsset.id}`;
  await db.fileAsset.update({ where: { id: fileAsset.id }, data: { url } });

  return NextResponse.json({ fileId: fileAsset.id, url });
}
