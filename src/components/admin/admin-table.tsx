export function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-semibold">{children}</th>;
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-border bg-secondary/50 text-start">{children}</thead>;
}
