'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ApiResponse } from '@/lib/types';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      });
      const body = (await res.json()) as ApiResponse<unknown>;

      if (!body.ok) {
        setError(body.error.message);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError('تعذر الاتصال بالخادم. حاول مجددًا.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface flex flex-col gap-4 p-6">
      <div>
        <label htmlFor="email" className="field-label">
          البريد الإلكتروني
        </label>
        <Input id="email" name="email" type="email" required dir="ltr" autoComplete="username" />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          كلمة المرور
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          dir="ltr"
          autoComplete="current-password"
        />
      </div>

      {error && (
        <Alert variant="danger" role="alert">
          <AlertDescription className="text-foreground">{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
        {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
      </Button>
    </form>
  );
}
