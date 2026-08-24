import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>أهلًا فيك مرة ثانية 👋</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <LoginForm redirectTo={redirect} />
        <p className="text-center text-sm text-muted-foreground">
          ما عندك حساب؟{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            سجّل الآن
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
