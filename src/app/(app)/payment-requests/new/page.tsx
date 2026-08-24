import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireUser } from "@/server/auth/session";
import { listKnownUsers } from "@/server/friends/queries";
import { NewPaymentRequestForm } from "./new-request-form";

export const metadata: Metadata = { title: "مطالبة شخص" };

export default async function NewPaymentRequestPage() {
  const user = await requireUser();
  const knownUsers = await listKnownUsers(user.id);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">مطالبة شخص</CardTitle>
          <CardDescription>أرسل طلب دفع مباشر لأي شخص، حتى لو ما عنده حساب</CardDescription>
        </CardHeader>
        <CardContent>
          <NewPaymentRequestForm knownUsers={knownUsers} defaultCurrency={user.defaultCurrency} />
        </CardContent>
      </Card>
    </div>
  );
}
