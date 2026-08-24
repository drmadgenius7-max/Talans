"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import type { ActionResult } from "@/server/auth/actions";

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { success: true };
}

export async function updateNotificationPreferencesAction(input: {
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  notifyPush: boolean;
  reminderAutoEnabled: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  await db.userPreference.upsert({
    where: { userId: user.id },
    update: input,
    create: { userId: user.id, ...input },
  });
  revalidatePath("/settings/preferences");
  return { success: true };
}
