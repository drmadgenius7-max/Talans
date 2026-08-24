export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">آخر تحديث: {updatedAt}</p>

      <div className="mt-4 rounded-xl border border-accent-300 bg-accent-50 p-4 text-sm text-accent-900">
        ⚠️ هذه نسخة أولية للعرض التوضيحي فقط. يجب مراجعتها من قِبل مستشار قانوني مختص قبل الإطلاق التجاري الفعلي
        والتعامل مع أموال حقيقية.
      </div>

      <div className="prose prose-neutral mt-8 max-w-none space-y-4 text-sm leading-loose text-muted-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground">
        {children}
      </div>
    </div>
  );
}
