import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "إعادة تعيين كلمة المرور" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">كلمة مرور جديدة</CardTitle>
        <CardDescription>اختر كلمة مرور قوية لحسابك</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
