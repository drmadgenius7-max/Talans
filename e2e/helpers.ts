import type { Page } from "@playwright/test";

export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

export async function signUp(page: Page, name: string, suffix: string) {
  await page.goto("/signup");
  await page.getByLabel("الاسم الكامل").fill(name);
  await page.getByLabel("رقم الجوال").fill(`05${suffix.slice(-8).padStart(8, "0")}`);
  await page.getByLabel("البريد الإلكتروني (اختياري)").fill(`user${suffix}@example.com`);
  await page.getByLabel("كلمة المرور", { exact: true }).fill("Passw0rd123");
  await page.getByLabel("تأكيد كلمة المرور").fill("Passw0rd123");
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/onboarding");
  await page.getByText("تخطي").click();
  await page.waitForURL("**/dashboard");
}
