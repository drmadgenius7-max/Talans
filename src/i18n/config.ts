/**
 * i18n architecture — Arabic (RTL) is the only shipped locale today, but
 * the app is built so English (LTR) can be added without rebuilding any
 * screen:
 *
 *  1. User.locale (Prisma) already stores a per-user locale preference.
 *  2. Every locale-sensitive formatter (src/lib/money.ts, src/lib/time.ts)
 *     takes an explicit `locale: "ar" | "en"` parameter rather than
 *     hardcoding Arabic — they already produce correct English output
 *     today, they're just always called with "ar" until a UI toggle exists.
 *  3. All layout/spacing in components/styles uses CSS logical properties
 *     (ps-/pe-/ms-/me-/text-start/text-end, never left:/right:/ml-/mr-) so
 *     flipping `dir` doesn't require touching component markup.
 *  4. <html lang dir> in src/app/layout.tsx is the single place direction
 *     is decided; once a second locale ships it reads `getCurrentUser()`
 *     (or an unauthenticated cookie) instead of the current hardcoded
 *     "ar"/"rtl".
 *
 * Adding English is then: translate SUPPORTED_LOCALES' dictionary,
 * replace hardcoded Arabic JSX strings with dictionary lookups screen by
 * screen, and flip step 4 above to be dynamic. No architecture changes.
 */
export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_DIRECTION: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};
