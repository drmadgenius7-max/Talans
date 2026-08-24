"use client";

import Link from "next/link";
import { Bell, LogOut, Settings, User as UserIcon, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logOutAction } from "@/server/auth/actions";

export function TopBar({
  name,
  avatarUrl,
  unreadCount,
}: {
  name: string;
  avatarUrl: string | null;
  unreadCount: number;
}) {
  const initials = name.trim().slice(0, 1);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="sm:hidden text-xl font-black text-primary-700">قِطّة</div>
      <div className="hidden text-lg font-bold sm:block">مرحبًا، {name.split(" ")[0]} 👋</div>

      <div className="flex items-center gap-2">
        <Link
          href="/search"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary"
          aria-label="بحث"
        >
          <Search className="h-5 w-5" />
        </Link>
        <Link
          href="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary"
          aria-label="الإشعارات"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -end-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-secondary">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrl ?? undefined} alt={name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserIcon className="h-4 w-4" /> حسابي
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/preferences">
                <Settings className="h-4 w-4" /> الإعدادات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logOutAction()} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
