import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listKnownUsers } from "@/server/friends/queries";
import { getFriendNetBalance } from "@/server/friends/balance";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoneyText } from "@/components/money-text";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "الأصدقاء" };

export default async function FriendsPage() {
  const user = await requireUser();
  const knownUsers = await listKnownUsers(user.id);

  const withBalances = await Promise.all(
    knownUsers.map(async (u) => ({ ...u, balance: await getFriendNetBalance(user.id, u.id, user.defaultCurrency) })),
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">الأصدقاء</h1>

      {withBalances.length === 0 ? (
        <EmptyState icon={Users} title="ما عندك أصدقاء بعد" description="انضم لمجموعة أو أنشئ واحدة عشان يظهرون هنا." />
      ) : (
        <div className="space-y-2">
          {withBalances.map((friend) => (
            <Link key={friend.id} href={`/friends/${friend.id}`}>
              <Card className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={friend.avatarUrl ?? undefined} />
                    <AvatarFallback>{friend.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">{friend.name}</span>
                </div>
                <div className="text-end text-sm">
                  {friend.balance === 0 ? (
                    <span className="text-muted-foreground">متعادلون</span>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">{friend.balance > 0 ? "لك عليه" : "عليك له"}</p>
                      <MoneyText
                        amountMinor={Math.abs(friend.balance)}
                        currency={user.defaultCurrency}
                        className={friend.balance > 0 ? "font-bold text-success" : "font-bold text-destructive"}
                      />
                    </>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
