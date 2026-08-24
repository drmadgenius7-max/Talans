import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">أنشئ حسابك في قِطّة</CardTitle>
        <CardDescription>يستغرق أقل من دقيقة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          عندك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            سجّل دخولك
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
