"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { CreateSheet } from "./create-sheet";

export function AppShell({
  name,
  avatarUrl,
  unreadCount,
  children,
}: {
  name: string;
  avatarUrl: string | null;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <Sidebar onCreateClick={() => setCreateOpen(true)} />
      <div className="flex min-h-dvh flex-1 flex-col">
        <TopBar name={name} avatarUrl={avatarUrl} unreadCount={unreadCount} />
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <BottomNav onCreateClick={() => setCreateOpen(true)} />
      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
