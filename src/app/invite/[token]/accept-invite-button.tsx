"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/server/groups/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    const result = await acceptInviteAction(token);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "حدث خطأ");
      return;
    }
    router.push(`/groups/${result.groupId}`);
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" loading={loading} onClick={accept}>
        انضمام للمجموعة
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
