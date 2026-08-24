import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function MoneyText({
  amountMinor,
  currency,
  className,
  sign = false,
}: {
  amountMinor: number;
  currency: string;
  className?: string;
  sign?: boolean;
}) {
  const positive = amountMinor > 0;
  const negative = amountMinor < 0;
  return (
    <span
      className={cn(
        "tabular-nums",
        sign && positive && "text-success",
        sign && negative && "text-destructive",
        className,
      )}
    >
      {sign && positive ? "+" : ""}
      {formatMoney(amountMinor, currency)}
    </span>
  );
}
