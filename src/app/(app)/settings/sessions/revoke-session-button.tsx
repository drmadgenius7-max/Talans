"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revokeSessionAction } from "@/server/auth/actions";

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await revokeSessionAction(sessionId);
          router.refresh();
        })
      }
    >
      <X className="h-4 w-4 text-destructive" />
    </Button>
  );
}
