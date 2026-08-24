import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/server/notifications/notify";
import { formatMoney } from "@/lib/money";

/**
 * Lazy automatic reminder pass — there is no background scheduler in this
 * codebase, so instead of a cron job we run a cheap, idempotent check
 * whenever the requester's dashboard loads: any of their outstanding
 * requests that are due today/overdue and haven't been reminded in the
 * last 24h get one. Reminder scheduler abstraction lives here so a real
 * cron/queue can later call the same function on a timer instead.
 */
export async function runAutoReminders(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const candidates = await db.paymentRequest.findMany({
    where: {
      requesterId: userId,
      status: { in: ["PENDING", "VIEWED", "PARTIALLY_PAID"] },
      dueDate: { lte: new Date() },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: cutoff } }],
      payerUserId: { not: null },
    },
    take: 20,
  });

  for (const request of candidates) {
    const preference = request.payerUserId
      ? await db.userPreference.findUnique({ where: { userId: request.payerUserId } })
      : null;
    if (preference && !preference.reminderAutoEnabled) continue;

    await db.$transaction(async (tx) => {
      await tx.reminder.create({
        data: {
          paymentRequestId: request.id,
          channel: "IN_APP",
          scheduledFor: new Date(),
          sentAt: new Date(),
          status: "SENT",
          isAutomatic: true,
        },
      });
      await tx.paymentRequest.update({ where: { id: request.id }, data: { lastReminderAt: new Date(), status: "OVERDUE" } });
      if (request.payerUserId) {
        await notify(tx, {
          userId: request.payerUserId,
          type: "PAYMENT_REQUEST_OVERDUE",
          title: "مطالبة متأخرة",
          body: `مطالبتك بـ ${formatMoney(request.amount - request.paidAmount, request.currency)} عن "${request.reason}" متأخرة`,
          data: { paymentRequestId: request.id },
        });
      }
    });
  }
}
