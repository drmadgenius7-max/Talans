import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireUser } from "@/server/auth/session";
import { listKnownUsers } from "@/server/friends/queries";
import { NewSharedPaymentForm } from "./new-shared-payment-form";

export const metadata: Metadata = { title: "دفع تشاركي جديد" };

export default async function NewSharedPaymentPage() {
  const user = await requireUser();
  const knownUsers = await listKnownUsers(user.id);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">دفع تشاركي جديد</CardTitle>
          <CardDescription>اجمعوا المبلغ أولًا قبل ما تشترون شيء مع بعض</CardDescription>
        </CardHeader>
        <CardContent>
          <NewSharedPaymentForm knownUsers={knownUsers} defaultCurrency={user.defaultCurrency} />
        </CardContent>
      </Card>
    </div>
  );
}
