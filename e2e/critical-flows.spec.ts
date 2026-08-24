import { test, expect } from "@playwright/test";
import { signUp, uniqueSuffix } from "./helpers";

/**
 * Covers the three "Critical End-to-End Flows" from the product spec:
 * A) دفعت عنهم (paid for them) — expense split, auto-generated payment
 *    requests, public pay link, mock payment, balance update.
 * B) Shared Payment — crowdfunding progress up to 100% / FUNDED.
 * C) Group Ledger — multi-payer expenses, debt simplification, settle-up.
 *
 * Guests (محمد/خالد/عبدالله/أحمد) never need their own session: they're
 * added as no-account group members and their /pay links work without
 * login, exactly as the public-link requirement demands.
 */

test.describe.configure({ mode: "serial" });

test("Scenario A — دفعت عنهم: split, auto-requests, public pay, balance update", async ({ page }) => {
  const suffix = uniqueSuffix();
  await signUp(page, "أنس الاختبار", suffix);

  // Create the group with 3 guest members.
  await page.goto("/groups/new");
  await page.getByLabel("اسم المجموعة").fill(`مجموعة اختبار A ${suffix}`);
  for (const name of ["محمد", "خالد", "عبدالله"]) {
    await page.getByRole("button", { name: "إضافة عضو" }).click();
  }
  const nameInputs = page.locator('input[placeholder="الاسم"]');
  await nameInputs.nth(0).fill("محمد");
  await nameInputs.nth(1).fill("خالد");
  await nameInputs.nth(2).fill("عبدالله");
  await page.getByRole("button", { name: "إنشاء المجموعة" }).click();
  await page.waitForURL(/\/groups\/(?!new$)[a-z0-9]{15,}$/);
  const groupUrl = page.url();
  const groupId = groupUrl.split("/groups/")[1]!;

  // Add the 800 SAR restaurant expense, paid entirely by أنس (me), equal
  // split across all 4 members, with auto payment-request generation.
  await page.goto(`/expenses/new?mode=paid_for_them&groupId=${groupId}`);
  await page.getByLabel("اسم المصروف").fill("عشاء الجمعة");
  await page.getByLabel(/المبلغ \(/).fill("800");
  await expect(page.getByText("معاينة التقسيم")).toBeVisible();
  await expect(page.getByText("200.00 ر.س").first()).toBeVisible();
  await page.getByRole("button", { name: "حفظ المصروف" }).click();

  await expect(page.getByText("تم إنشاء المطالبات")).toBeVisible({ timeout: 10_000 });

  // Extract محمد's pay link from the WhatsApp share href.
  const whatsappLinks = page.getByRole("link", { name: /واتساب/ });
  const firstHref = await whatsappLinks.first().getAttribute("href");
  expect(firstHref).toBeTruthy();
  const decoded = decodeURIComponent(firstHref!);
  const match = decoded.match(/http:\/\/[^\s]+\/pay\/[A-Za-z0-9_-]+/);
  expect(match).toBeTruthy();
  const payUrl = match![0];

  // Open the public pay link (simulating a different device / no login).
  await page.goto(payUrl);
  await expect(page.getByText("200.00 ر.س")).toBeVisible();
  await page.getByRole("button", { name: /^ادفع/ }).click();
  await page.waitForURL(/\/pay\/simulate\//);
  await expect(page.getByText("محاكاة دفع")).toBeVisible();

  await page.getByRole("button", { name: "نجاح الدفع" }).click();
  await page.waitForURL(/\/pay\//);
  await expect(page.getByText("تم الدفع بنجاح")).toBeVisible({ timeout: 10_000 });

  // Balance should now reflect the payment on the group page.
  await page.goto(groupUrl);
  await expect(page.getByText("متعادل")).toBeVisible({ timeout: 10_000 });
});

test("Scenario B — الدفع التشاركي: contributions reach 100% and FUNDED", async ({ page }) => {
  const suffix = uniqueSuffix();
  await signUp(page, "منشئ القطة", suffix);

  await page.goto("/shared-payments/new");
  await page.getByLabel("عنوان العملية").fill(`هدية الوالدة ${suffix}`);
  await page.getByLabel("الهدف").fill("2500");
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "إضافة مشارك" }).click();
  }
  const guestNameInputs = page.locator('input[placeholder="الاسم"]');
  const names = ["ابن1", "ابن2", "ابن3", "ابن4", "ابن5"];
  for (let i = 0; i < 5; i++) {
    await guestNameInputs.nth(i).fill(names[i]!);
  }
  await page.getByRole("button", { name: "إنشاء القِطّة" }).click();
  await page.waitForURL(/\/qitta\//);
  const sharedUrl = page.url();

  for (let i = 0; i < 5; i++) {
    await page.goto(sharedUrl);
    await page.getByLabel("مبلغ المساهمة").fill("500");
    await page.getByRole("button", { name: "ساهم الآن" }).click();
    await page.waitForURL(/\/pay\/simulate\//);
    await page.getByRole("button", { name: "نجاح الدفع" }).click();
    await page.waitForURL(/\/qitta\//);
  }

  await expect(page.getByText("اكتملت القِطّة")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("مكتملة").first()).toBeVisible();
});

test("Scenario C — Group Ledger: multi-payer expenses, debt simplification, settle-up", async ({ page }) => {
  const suffix = uniqueSuffix();
  await signUp(page, "أنس الرحلة", suffix);

  await page.goto("/groups/new");
  await page.getByLabel("اسم المجموعة").fill(`رحلة البحرين ${suffix}`);
  for (const name of ["محمد", "خالد", "أحمد"]) {
    await page.getByRole("button", { name: "إضافة عضو" }).click();
  }
  const nameInputs = page.locator('input[placeholder="الاسم"]');
  await nameInputs.nth(0).fill("محمد");
  await nameInputs.nth(1).fill("خالد");
  await nameInputs.nth(2).fill("أحمد");
  await page.getByRole("button", { name: "إنشاء المجموعة" }).click();
  await page.waitForURL(/\/groups\/(?!new$)[a-z0-9]{15,}$/);
  const groupUrl = page.url();
  const groupId = groupUrl.split("/groups/")[1]!;

  // أنس دفع الفندق 1200 (default single payer = me).
  await page.goto(`/expenses/new?mode=general&groupId=${groupId}`);
  await page.getByLabel("اسم المصروف").fill("الفندق");
  await page.getByLabel(/المبلغ \(/).fill("1200");
  await page.getByRole("button", { name: "حفظ المصروف" }).click();
  await page.waitForURL(new RegExp(`/groups/${groupId}$`));

  // محمد دفع المطعم 600 — enable multi-payer, fill the total plus محمد's row.
  await page.goto(`/expenses/new?mode=general&groupId=${groupId}`);
  await page.getByLabel("اسم المصروف").fill("المطعم");
  await page.getByLabel(/المبلغ \(/).fill("600");
  await page.getByRole("switch").click();
  const payerRow = page.locator("div.flex.items-center.gap-2", { hasText: "محمد" });
  await payerRow.locator("input").fill("600");
  await page.getByRole("button", { name: "حفظ المصروف" }).click();
  await page.waitForURL(new RegExp(`/groups/${groupId}$`));

  // خالد دفع البنزين 300.
  await page.goto(`/expenses/new?mode=general&groupId=${groupId}`);
  await page.getByLabel("اسم المصروف").fill("البنزين");
  await page.getByLabel(/المبلغ \(/).fill("300");
  await page.getByRole("switch").click();
  const payerRow2 = page.locator("div.flex.items-center.gap-2", { hasText: "خالد" });
  await payerRow2.locator("input").fill("300");
  await page.getByRole("button", { name: "حفظ المصروف" }).click();
  await page.waitForURL(new RegExp(`/groups/${groupId}$`));

  // Settlement plan: أحمد owes أنس 525 in full; خالد's 225 debt is split
  // across two creditors (150 to أنس, 75 to محمد) by the min-transfer
  // algorithm — both are correct, they just don't collapse into one line.
  await page.goto(`/groups/${groupId}/settle`);
  await expect(page.getByText("525.00 ر.س")).toBeVisible();
  await expect(page.getByText("150.00 ر.س")).toBeVisible();
  await expect(page.getByText("75.00 ر.س")).toBeVisible();

  // Pay off every transfer whose recipient has a real account via the
  // online request flow (محمد and خالد/أحمد here are guests, so only
  // transfers INTO أنس — the logged-in account — can receive a request).
  const enabledSendButton = page.getByRole("button", { name: "أرسل مطالبة", disabled: false });
  let enabledCount = await enabledSendButton.count();
  while (enabledCount > 0) {
    await enabledSendButton.first().click();
    await page.waitForURL(/\/pay\//);
    await page.getByRole("button", { name: /^ادفع/ }).click();
    await page.waitForURL(/\/pay\/simulate\//);
    await page.getByRole("button", { name: "نجاح الدفع" }).click();
    await page.waitForURL(/\/pay\//);
    await page.goto(`/groups/${groupId}/settle`);
    enabledCount = await enabledSendButton.count();
  }

  // The remaining transfer (into guest محمد) can't receive an online
  // request — record it as a manual settlement instead.
  await expect(page.getByText("75.00 ر.س")).toBeVisible();
  await page.getByRole("button", { name: "تم الدفع خارج قِطّة" }).click();
  await page.getByRole("button", { name: "تأكيد التسوية" }).click();
  await expect(page.getByText("تم تسجيل التسوية")).toBeVisible({ timeout: 10_000 });

  await page.goto(`/groups/${groupId}/settle`);
  await expect(page.getByText("تمت التسوية بالكامل")).toBeVisible({ timeout: 10_000 });
});
