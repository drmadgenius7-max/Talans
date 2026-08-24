import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "تواصل معنا" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black">تواصل معنا</h1>
        <p className="mt-3 text-muted-foreground">عندك سؤال أو اقتراح؟ يسعدنا نسمع منك</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">أرسل رسالة</CardTitle>
          <CardDescription>بنرد عليك في أقرب وقت</CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
