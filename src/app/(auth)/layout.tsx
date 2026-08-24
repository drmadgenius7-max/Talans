import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-50 via-background to-background">
      <header className="p-6">
        <Link href="/" className="text-2xl font-black text-primary-700">
          قِطّة
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
