"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import { generateSecureToken } from "@/lib/tokens";
import { logActivity } from "@/server/notifications/notify";
import { assertPermission, ForbiddenError } from "./permissions";
import { createGroupSchema, updateGroupSchema, createInviteSchema, addGuestMemberSchema } from "@/lib/validation/groups";
import type { ActionResult } from "@/server/auth/actions";
import type { GroupRole } from "@prisma/client";

export async function createGroupAction(input: unknown): Promise<ActionResult & { groupId?: string }> {
  const user = await requireUser();
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const data = parsed.data;

  const group = await db.$transaction(async (tx) => {
    const g = await tx.group.create({
      data: {
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        type: data.type,
        currency: data.currency,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdById: user.id,
        members: {
          create: [
            { userId: user.id, role: "OWNER" },
            ...data.guestMembers.map((guest) => ({
              guestName: guest.name,
              guestPhone: guest.phone || null,
              guestEmail: guest.email || null,
              role: "MEMBER" as const,
              invitedById: user.id,
            })),
          ],
        },
      },
    });

    await logActivity(tx, {
      groupId: g.id,
      actorUserId: user.id,
      type: "GROUP_CREATED",
      message: `${user.name} أنشأ المجموعة`,
      targetType: "Group",
      targetId: g.id,
    });

    return g;
  });

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { success: true, groupId: group.id };
}

export async function updateGroupAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const { groupId, ...data } = parsed.data;

  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "EDIT_GROUP");

  await db.group.update({
    where: { id: groupId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
      ...(data.type ? { type: data.type } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
    },
  });

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function archiveGroupAction(groupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "DELETE_GROUP");

  await db.group.update({ where: { id: groupId }, data: { isArchived: true } });
  revalidatePath("/groups");
  return { success: true };
}

export async function addGuestMemberAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addGuestMemberSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const { groupId, name, phone, email } = parsed.data;

  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "INVITE_MEMBERS");

  await db.$transaction(async (tx) => {
    await tx.groupMember.create({
      data: { groupId, guestName: name, guestPhone: phone || null, guestEmail: email || null, role: "MEMBER", invitedById: user.id },
    });
    await logActivity(tx, {
      groupId,
      actorUserId: user.id,
      type: "MEMBER_ADDED",
      message: `${user.name} أضاف ${name} إلى المجموعة`,
    });
  });

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function createInviteAction(input: unknown): Promise<ActionResult & { token?: string }> {
  const user = await requireUser();
  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const { groupId, type, email, phone, roleOnJoin, expiresInDays } = parsed.data;

  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "INVITE_MEMBERS");

  const token = generateSecureToken(24);
  await db.groupInvite.create({
    data: {
      groupId,
      token,
      type,
      email: email || null,
      phone: phone || null,
      roleOnJoin,
      createdById: user.id,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
    },
  });

  return { success: true, token };
}

export async function acceptInviteAction(token: string): Promise<ActionResult & { groupId?: string }> {
  const user = await requireUser();

  const invite = await db.groupInvite.findUnique({ where: { token } });
  if (!invite) return { success: false, error: "رابط الدعوة غير صالح" };
  if (invite.revokedAt) return { success: false, error: "تم إلغاء رابط الدعوة" };
  if (invite.expiresAt && invite.expiresAt < new Date()) return { success: false, error: "انتهت صلاحية رابط الدعوة" };
  if (invite.maxUses && invite.useCount >= invite.maxUses) return { success: false, error: "تم استخدام رابط الدعوة بالكامل" };

  const existing = await db.groupMember.findUnique({ where: { groupId_userId: { groupId: invite.groupId, userId: user.id } } });

  await db.$transaction(async (tx) => {
    if (existing) {
      if (existing.status !== "ACTIVE") {
        await tx.groupMember.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
      }
    } else {
      await tx.groupMember.create({
        data: { groupId: invite.groupId, userId: user.id, role: invite.roleOnJoin, invitedById: invite.createdById },
      });
    }
    await tx.groupInvite.update({
      where: { id: invite.id },
      data: { useCount: { increment: 1 }, usedByUserId: user.id, usedAt: new Date() },
    });
    await logActivity(tx, {
      groupId: invite.groupId,
      actorUserId: user.id,
      type: "MEMBER_JOINED",
      message: `${user.name} انضم إلى المجموعة`,
    });
  });

  revalidatePath(`/groups/${invite.groupId}`);
  return { success: true, groupId: invite.groupId };
}

export async function claimGuestMemberAction(guestMemberId: string): Promise<ActionResult> {
  const user = await requireUser();
  const guest = await db.groupMember.findUnique({ where: { id: guestMemberId } });
  if (!guest || guest.userId) return { success: false, error: "لا يمكن ربط هذا العضو" };

  const existing = await db.groupMember.findUnique({ where: { groupId_userId: { groupId: guest.groupId, userId: user.id } } });
  if (existing) return { success: false, error: "أنت عضو بالفعل في هذه المجموعة" };

  await db.groupMember.update({
    where: { id: guestMemberId },
    data: { userId: user.id, claimedByUserId: user.id, claimedAt: new Date() },
  });

  revalidatePath(`/groups/${guest.groupId}`);
  return { success: true };
}

export async function updateMemberRoleAction(groupId: string, targetMemberId: string, role: GroupRole): Promise<ActionResult> {
  const user = await requireUser();
  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "MANAGE_MEMBERS");

  const target = await db.groupMember.findUniqueOrThrow({ where: { id: targetMemberId } });
  if (target.role === "OWNER") return { success: false, error: "لا يمكن تغيير دور مالك المجموعة" };

  await db.groupMember.update({ where: { id: targetMemberId }, data: { role } });
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function removeMemberAction(groupId: string, targetMemberId: string): Promise<ActionResult> {
  const user = await requireUser();
  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "MANAGE_MEMBERS");

  const target = await db.groupMember.findUniqueOrThrow({ where: { id: targetMemberId } });
  if (target.role === "OWNER") return { success: false, error: "لا يمكن إزالة مالك المجموعة" };

  const balance = await db.ledgerEntry.aggregate({ where: { groupMemberId: targetMemberId }, _sum: { amount: true } });
  if ((balance._sum.amount ?? 0) !== 0) {
    return { success: false, error: "لا يمكن إزالة عضو له رصيد غير مسوّى" };
  }

  await db.groupMember.update({ where: { id: targetMemberId }, data: { status: "REMOVED", leftAt: new Date() } });
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function leaveGroupAction(groupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const member = await requireMembership(groupId, user.id);
  if (member.role === "OWNER") {
    return { success: false, error: "لا يمكن لمالك المجموعة مغادرتها، انقل الملكية أولًا" };
  }

  const balance = await db.ledgerEntry.aggregate({ where: { groupMemberId: member.id }, _sum: { amount: true } });
  if ((balance._sum.amount ?? 0) !== 0) {
    return { success: false, error: "لازم تسوّي حسابك في المجموعة قبل ما تطلع منها" };
  }

  await db.groupMember.update({ where: { id: member.id }, data: { status: "LEFT", leftAt: new Date() } });
  revalidatePath("/groups");
  return { success: true };
}

export async function requireMembership(groupId: string, userId: string) {
  const member = await db.groupMember.findFirst({ where: { groupId, userId, status: "ACTIVE" } });
  if (!member) throw new ForbiddenError("لست عضوًا في هذه المجموعة");
  return member;
}
