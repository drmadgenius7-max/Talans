'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
        router.replace('/admin/login');
        router.refresh();
      }}
    >
      <LogOut />
      <span className="hidden sm:inline">خروج</span>
    </Button>
  );
}
