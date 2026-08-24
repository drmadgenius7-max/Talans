import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GROUP_ROLE_LABELS_AR } from "@/lib/labels";
import { MemberActionsMenu } from "./member-actions-menu";

interface MemberRow {
  id: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  isGuest: boolean;
  role: string;
  netBalance: number;
}

export function GroupMembersList({
  groupId,
  members,
  canManage,
}: {
  groupId: string;
  members: MemberRow[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link href={`/groups/${groupId}/invite`}>
            <UserPlus className="h-4 w-4" /> دعوة أعضاء
          </Link>
        </Button>
      </div>
      {members.map((member) => (
        <Card key={member.id} className="flex items-center gap-3 p-3.5">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatarUrl ?? undefined} />
            <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{member.name}</p>
              {member.isGuest && (
                <Badge variant="outline" className="text-[10px]">
                  ضيف
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="mt-0.5">
              {GROUP_ROLE_LABELS_AR[member.role]}
            </Badge>
          </div>
          {canManage && member.role !== "OWNER" ? (
            <MemberActionsMenu groupId={groupId} memberId={member.id} currentRole={member.role} />
          ) : null}
        </Card>
      ))}
    </div>
  );
}
