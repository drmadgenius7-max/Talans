"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { updateMemberRoleAction, removeMemberAction } from "@/server/groups/actions";
import { toast } from "@/components/ui/toaster";
import type { GroupRole } from "@prisma/client";

export function MemberActionsMenu({
  groupId,
  memberId,
  currentRole,
}: {
  groupId: string;
  memberId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setRole(role: GroupRole) {
    startTransition(async () => {
      const result = await updateMemberRoleAction(groupId, memberId, role);
      if (!result.success) toast.error(result.error);
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction(groupId, memberId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("تمت إزالة العضو");
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currentRole !== "ADMIN" && <DropdownMenuItem onClick={() => setRole("ADMIN")}>ترقية لمشرف</DropdownMenuItem>}
        {currentRole !== "MEMBER" && <DropdownMenuItem onClick={() => setRole("MEMBER")}>تحويل لعضو</DropdownMenuItem>}
        {currentRole !== "VIEWER" && <DropdownMenuItem onClick={() => setRole("VIEWER")}>تحويل لمشاهد</DropdownMenuItem>}
        <DropdownMenuItem onClick={remove} className="text-destructive focus:text-destructive">
          إزالة من المجموعة
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
