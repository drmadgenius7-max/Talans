/**
 * Example dictionary shape for the shared chrome (nav, common actions).
 * Screen-level strings are still inline JSX today (see src/i18n/config.ts
 * for the plan to migrate them) — this file demonstrates the pattern a
 * real English translation would follow.
 */
export const ar = {
  nav: {
    home: "الرئيسية",
    groups: "المجموعات",
    activity: "النشاط",
    account: "حسابي",
    insights: "الإحصائيات",
  },
  common: {
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    loading: "جاري التحميل...",
  },
} as const;

export type Dictionary = typeof ar;
