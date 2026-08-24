"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimGuestMemberAction } from "@/server/groups/actions";
import { toast } from "@/components/ui/toaster";

export function ClaimGuestBanner({ guestMemberId, guestName }: { guestMemberId: string; guestName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function claim() {
    startTransition(async () => {
      const result = await claimGuestMemberAction(guestMemberId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("تم ربط مشاركاتك السابقة بحسابك");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent-300 bg-accent-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-accent-600" />
        <span>
          لقيناك مضاف كضيف باسم <b>{guestName}</b> بمصاريف سابقة. تبي تربطها بحسابك؟
        </span>
      </div>
      <Button size="sm" variant="accent" onClick={claim} loading={isPending}>
        ربط المشاركات
      </Button>
    </div>
  );
}
