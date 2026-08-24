import "server-only";
import type { Prisma, PrismaClient, NotificationType } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * In-app notifications are always written directly (source of truth for the
 * notification center). SMS/WhatsApp/Email/Push are fanned out through the
 * provider abstraction in src/server/notifications/providers — today those
 * are mock/no-op providers that just log, ready to be swapped for real
 * integrations later without touching call sites like this one.
 */
export async function notify(tx: Tx, input: NotifyInput): Promise<void> {
  await tx.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function logActivity(
  tx: Tx,
  input: {
    groupId?: string;
    actorUserId?: string;
    type: string;
    message: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.activityLog.create({
    data: {
      groupId: input.groupId,
      actorUserId: input.actorUserId,
      type: input.type,
      message: input.message,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
