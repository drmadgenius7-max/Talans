import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewGroupForm } from "./new-group-form";

export const metadata: Metadata = { title: "إنشاء مجموعة" };

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">إنشاء مجموعة جديدة</CardTitle>
          <CardDescription>رحلة، سكن، مناسبة، أو أي شيء تحبون تتقاسمون مصاريفه</CardDescription>
        </CardHeader>
        <CardContent>
          <NewGroupForm />
        </CardContent>
      </Card>
    </div>
  );
}
