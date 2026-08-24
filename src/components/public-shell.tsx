import Link from "next/link";

export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-50 via-background to-background">
      <header className="p-6 text-center sm:text-start">
        <Link href="/" className="text-2xl font-black text-primary-700">
          قِطّة
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="p-4 text-center text-xs text-muted-foreground">
        بواسطة <span className="font-semibold">قِطّة</span> — منصة إدارة المصاريف المشتركة
      </footer>
    </div>
  );
}
