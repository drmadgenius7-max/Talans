import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-7xl">🐱</p>
      <h1 className="text-3xl font-black">404 — الصفحة مو موجودة</h1>
      <p className="max-w-sm text-muted-foreground">يمكن الرابط تغيّر أو الصفحة انحذفت. تعال نرجعك للبيت.</p>
      <Button asChild>
        <Link href="/">الرجوع للرئيسية</Link>
      </Button>
    </div>
  );
}
