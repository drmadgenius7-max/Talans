import { redirect } from 'next/navigation';
import { AtharMark } from '@/components/brand';
import { LoginForm } from '@/components/admin/login-form';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'تسجيل دخول الإدارة' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith('/admin') ? next : '/admin');

  return (
    <div className="hero-texture flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="text-primary">
            <AtharMark className="size-11" />
          </span>
          <div>
            <h1 className="text-lg font-bold">لوحة تحكم أثر للتحقق</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              الدخول مخصص لفريق متجر أثر فقط.
            </p>
          </div>
        </div>

        <LoginForm next={next && next.startsWith('/admin') ? next : '/admin'} />
      </div>
    </div>
  );
}
