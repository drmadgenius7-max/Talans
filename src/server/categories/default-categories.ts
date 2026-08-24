export const DEFAULT_CATEGORIES = [
  { key: "restaurants", nameAr: "مطاعم", nameEn: "Restaurants", icon: "🍔" },
  { key: "housing", nameAr: "سكن", nameEn: "Housing", icon: "🏠" },
  { key: "transport", nameAr: "مواصلات", nameEn: "Transport", icon: "🚗" },
  { key: "travel", nameAr: "سفر", nameEn: "Travel", icon: "✈️" },
  { key: "shopping", nameAr: "مشتريات", nameEn: "Shopping", icon: "🛒" },
  { key: "gifts", nameAr: "هدايا", nameEn: "Gifts", icon: "🎁" },
  { key: "events", nameAr: "مناسبات", nameEn: "Events", icon: "🎉" },
  { key: "bills", nameAr: "فواتير", nameEn: "Bills", icon: "💡" },
  { key: "entertainment", nameAr: "ترفيه", nameEn: "Entertainment", icon: "🎮" },
  { key: "education", nameAr: "تعليم", nameEn: "Education", icon: "📚" },
  { key: "health", nameAr: "صحة", nameEn: "Health", icon: "🩺" },
  { key: "other", nameAr: "أخرى", nameEn: "Other", icon: "➕" },
] as const;

export async function ensureDefaultCategories(db: { category: { upsert: (args: unknown) => Promise<unknown> } }) {
  for (const cat of DEFAULT_CATEGORIES) {
    await db.category.upsert({
      where: { key: cat.key },
      update: {},
      create: { key: cat.key, nameAr: cat.nameAr, nameEn: cat.nameEn, icon: cat.icon },
    });
  }
}
