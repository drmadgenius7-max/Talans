"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function GroupTabsClient({
  overview,
  expenses,
  members,
  activity,
}: {
  overview: React.ReactNode;
  expenses: React.ReactNode;
  members: React.ReactNode;
  activity: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="overview" dir="rtl">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="overview" className="flex-1 sm:flex-none">
          نظرة عامة
        </TabsTrigger>
        <TabsTrigger value="expenses" className="flex-1 sm:flex-none">
          المصاريف
        </TabsTrigger>
        <TabsTrigger value="members" className="flex-1 sm:flex-none">
          الأعضاء
        </TabsTrigger>
        <TabsTrigger value="activity" className="flex-1 sm:flex-none">
          النشاط
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="expenses">{expenses}</TabsContent>
      <TabsContent value="members">{members}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
    </Tabs>
  );
}
