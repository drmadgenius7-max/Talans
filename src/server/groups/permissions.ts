import type { GroupRole } from "@prisma/client";

export type GroupPermission =
  | "EDIT_GROUP"
  | "DELETE_GROUP"
  | "MANAGE_MEMBERS"
  | "INVITE_MEMBERS"
  | "ADD_EXPENSE"
  | "EDIT_ANY_EXPENSE"
  | "DELETE_EXPENSE"
  | "SETTLE"
  | "VIEW";

const ROLE_PERMISSIONS: Record<GroupRole, GroupPermission[]> = {
  OWNER: [
    "EDIT_GROUP",
    "DELETE_GROUP",
    "MANAGE_MEMBERS",
    "INVITE_MEMBERS",
    "ADD_EXPENSE",
    "EDIT_ANY_EXPENSE",
    "DELETE_EXPENSE",
    "SETTLE",
    "VIEW",
  ],
  ADMIN: ["EDIT_GROUP", "MANAGE_MEMBERS", "INVITE_MEMBERS", "ADD_EXPENSE", "EDIT_ANY_EXPENSE", "DELETE_EXPENSE", "SETTLE", "VIEW"],
  MEMBER: ["INVITE_MEMBERS", "ADD_EXPENSE", "SETTLE", "VIEW"],
  VIEWER: ["VIEW"],
};

export function roleHasPermission(role: GroupRole, permission: GroupPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export class ForbiddenError extends Error {
  constructor(message = "ليس لديك صلاحية لهذا الإجراء") {
    super(message);
  }
}

export function assertPermission(role: GroupRole, permission: GroupPermission): void {
  if (!roleHasPermission(role, permission)) throw new ForbiddenError();
}
