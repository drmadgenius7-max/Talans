/**
 * Demo seed data — separate from production data by design:
 *   - Only runs when ENABLE_DEMO_SEED=true (see .env.example).
 *   - Refuses to run against a production environment.
 *   - Idempotent: safe to re-run, upserts the demo accounts instead of
 *     duplicating them (though it will add fresh expenses/requests each
 *     run if the demo group already exists — delete the demo user first
 *     for a truly clean slate).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { DEFAULT_CATEGORIES } from "../src/server/categories/default-categories";

const db = new PrismaClient();

const DEMO_PASSWORD = "Demo1234";

function token() {
  return randomBytes(24).toString("base64url");
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO_SEED !== "true") {
    console.log("Refusing to seed demo data in production without ENABLE_DEMO_SEED=true.");
    return;
  }

  console.log("Seeding categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    await db.category.upsert({
      where: { key: cat.key },
      update: {},
      create: { key: cat.key, nameAr: cat.nameAr, nameEn: cat.nameEn, icon: cat.icon },
    });
  }
  const categories = await db.category.findMany();
  const catByKey = new Map(categories.map((c) => [c.key, c.id]));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Seeding demo users...");
  const anas = await upsertUser("demo@qitta.sa", "أنس القحطاني", "+966500000001", passwordHash);
  const mohammed = await upsertUser("mohammed@qitta.sa", "محمد العتيبي", "+966500000002", passwordHash);
  const sara = await upsertUser("sara@qitta.sa", "سارة الحربي", "+966500000003", passwordHash);
  const fahad = await upsertUser("fahad@qitta.sa", "فهد الدوسري", "+966500000004", passwordHash);

  // Make demo@qitta.sa an admin so the admin dashboard is reachable out of the box.
  await db.user.update({ where: { id: anas.id }, data: { role: "ADMIN" } });

  console.log("Seeding «رحلة البحرين» group...");
  const trip = await db.group.create({
    data: {
      name: "رحلة البحرين",
      description: "رحلة نهاية الأسبوع مع الشباب",
      type: "TRIP",
      currency: "SAR",
      createdById: anas.id,
      startDate: daysAgo(20),
      endDate: daysAgo(17),
      members: {
        create: [
          { userId: anas.id, role: "OWNER", joinedAt: daysAgo(20) },
          { userId: mohammed.id, role: "MEMBER", joinedAt: daysAgo(20) },
          { userId: sara.id, role: "MEMBER", joinedAt: daysAgo(20) },
          { userId: fahad.id, role: "MEMBER", joinedAt: daysAgo(20) },
          { guestName: "عبدالله", guestPhone: "+966500000099", role: "MEMBER", joinedAt: daysAgo(20) },
        ],
      },
    },
    include: { members: true },
  });
  const tripMembers = memberMap(trip.members);

  await seedExpenseEqualSplit(trip.id, {
    title: "الفندق",
    amount: 120000,
    categoryId: catByKey.get("housing"),
    date: daysAgo(19),
    payerMemberId: tripMembers.get(anas.id)!,
    participantIds: [...tripMembers.values()],
    createdById: anas.id,
  });
  await seedExpenseEqualSplit(trip.id, {
    title: "المطعم",
    amount: 60000,
    categoryId: catByKey.get("restaurants"),
    date: daysAgo(18),
    payerMemberId: tripMembers.get(mohammed.id)!,
    participantIds: [...tripMembers.values()],
    createdById: anas.id,
  });
  await seedExpenseEqualSplit(trip.id, {
    title: "البنزين",
    amount: 30000,
    categoryId: catByKey.get("transport"),
    date: daysAgo(18),
    payerMemberId: tripMembers.get(sara.id)!,
    participantIds: [...tripMembers.values()],
    createdById: anas.id,
  });

  await db.activityLog.createMany({
    data: [
      { groupId: trip.id, actorUserId: anas.id, type: "GROUP_CREATED", message: "أنس أنشأ المجموعة", createdAt: daysAgo(20) },
      { groupId: trip.id, actorUserId: mohammed.id, type: "MEMBER_JOINED", message: "محمد انضم إلى المجموعة", createdAt: daysAgo(20) },
      { groupId: trip.id, actorUserId: anas.id, type: "EXPENSE_ADDED", message: "أنس أضاف مصروف الفندق 1,200.00 SAR", createdAt: daysAgo(19) },
    ],
  });

  console.log("Seeding «استراحة الشباب» group...");
  const rest = await db.group.create({
    data: {
      name: "استراحة الشباب",
      type: "FRIENDS",
      currency: "SAR",
      createdById: anas.id,
      members: {
        create: [
          { userId: anas.id, role: "OWNER" },
          { userId: mohammed.id, role: "MEMBER" },
          { userId: fahad.id, role: "MEMBER" },
        ],
      },
    },
    include: { members: true },
  });
  const restMembers = memberMap(rest.members);
  await seedExpenseEqualSplit(rest.id, {
    title: "مشاوي",
    amount: 45000,
    categoryId: catByKey.get("restaurants"),
    date: daysAgo(5),
    payerMemberId: restMembers.get(anas.id)!,
    participantIds: [...restMembers.values()],
    createdById: anas.id,
  });

  console.log("Seeding «البيت» group...");
  const home = await db.group.create({
    data: {
      name: "البيت",
      type: "HOUSING",
      currency: "SAR",
      createdById: anas.id,
      members: {
        create: [
          { userId: anas.id, role: "OWNER" },
          { userId: sara.id, role: "MEMBER" },
        ],
      },
    },
    include: { members: true },
  });
  const homeMembers = memberMap(home.members);
  await seedExpenseEqualSplit(home.id, {
    title: "فاتورة الإنترنت",
    amount: 25000,
    categoryId: catByKey.get("bills"),
    date: daysAgo(3),
    payerMemberId: homeMembers.get(anas.id)!,
    participantIds: [...homeMembers.values()],
    createdById: anas.id,
  });

  console.log("Seeding shared payment «هدية الوالدة»...");
  const sharedToken = token();
  const gift = await db.sharedPayment.create({
    data: {
      title: "هدية الوالدة",
      description: "نجمع مبلغ هدية عيد ميلاد الوالدة 🎁",
      targetAmount: 250000,
      collectedAmount: 150000,
      currency: "SAR",
      createdById: anas.id,
      splitMethod: "EQUAL",
      status: "PARTIALLY_FUNDED",
      deadline: daysFromNow(10),
      secureToken: sharedToken,
      participants: {
        create: [
          { userId: anas.id, targetShare: 50000, paidAmount: 50000, status: "PAID" },
          { userId: mohammed.id, targetShare: 50000, paidAmount: 50000, status: "PAID" },
          { userId: sara.id, targetShare: 50000, paidAmount: 50000, status: "PAID" },
          { userId: fahad.id, targetShare: 50000, paidAmount: 0, status: "PENDING" },
          { guestName: "عبدالله", targetShare: 50000, paidAmount: 0, status: "PENDING" },
        ],
      },
    },
    include: { participants: true },
  });

  for (const p of gift.participants.filter((p) => p.paidAmount > 0)) {
    const txn = await db.transaction.create({
      data: {
        type: "CHARGE",
        purpose: "SHARED_PAYMENT_CONTRIBUTION",
        sharedPaymentId: gift.id,
        contributorUserId: p.userId,
        amount: p.paidAmount,
        currency: "SAR",
        status: "SUCCEEDED",
        provider: "mock",
        providerRef: `mock_seed_${token()}`,
        idempotencyKey: `idem_seed_${token()}`,
      },
    });
    await db.contribution.create({
      data: { sharedPaymentId: gift.id, transactionId: txn.id, amount: p.paidAmount },
    });
  }

  console.log("Seeding standalone payment requests...");
  await createPaymentRequest(anas.id, mohammed.id, 12000, "قهوة الصباح", "PENDING");
  await createPaymentRequest(anas.id, fahad.id, 8000, "بنزين الرحلة", "OVERDUE", daysAgo(2));
  await createPaymentRequest(mohammed.id, anas.id, 25000, "تذاكر السينما", "PAID");

  console.log("Seeding notifications...");
  await db.notification.createMany({
    data: [
      {
        userId: anas.id,
        type: "PAYMENT_RECEIVED",
        title: "محمد دفع لك",
        body: "دفع محمد 250.00 SAR عن تذاكر السينما",
        isRead: false,
      },
      {
        userId: anas.id,
        type: "SHARED_PAYMENT_PROGRESS",
        title: "مساهمة جديدة",
        body: "تبقى 1,000.00 SAR لاكتمال هدية الوالدة",
        isRead: false,
      },
      { userId: anas.id, type: "EXPENSE_ADDED", title: "مصروف جديد", body: "محمد أضاف مصروف مشاوي في استراحة الشباب", isRead: true },
    ],
  });

  console.log("\n✅ Demo seed complete.");
  console.log("   Login: demo@qitta.sa / Demo1234 (also mohammed@ / sara@ / fahad@qitta.sa, same password)");
  console.log(`   Shared payment link: /qitta/${sharedToken}`);
}

function memberMap(members: { id: string; userId: string | null }[]) {
  const map = new Map<string, string>();
  for (const m of members) if (m.userId) map.set(m.userId, m.id);
  return map;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}

async function upsertUser(email: string, name: string, phone: string, passwordHash: string) {
  return db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      phone,
      passwordHash,
      defaultCurrency: "SAR",
      country: "SA",
      locale: "ar",
      preference: { create: {} },
    },
  });
}

async function seedExpenseEqualSplit(
  groupId: string,
  args: {
    title: string;
    amount: number;
    categoryId?: string;
    date: Date;
    payerMemberId: string;
    participantIds: string[];
    createdById: string;
  },
) {
  const n = args.participantIds.length;
  const base = Math.floor(args.amount / n);
  const remainder = args.amount - base * n;

  const expense = await db.expense.create({
    data: {
      groupId,
      title: args.title,
      amount: args.amount,
      currency: "SAR",
      categoryId: args.categoryId,
      date: args.date,
      splitType: "EQUAL",
      createdById: args.createdById,
      payers: { create: [{ groupMemberId: args.payerMemberId, amount: args.amount }] },
      participants: {
        create: args.participantIds.map((id, i) => ({
          groupMemberId: id,
          owedAmount: base + (i < remainder ? 1 : 0),
        })),
      },
    },
    include: { participants: true },
  });

  const lines = [
    { groupId, groupMemberId: args.payerMemberId, type: "EXPENSE" as const, amount: args.amount, currency: "SAR", description: `دفع مصروف: ${args.title}`, expenseId: expense.id },
    ...expense.participants.map((p) => ({
      groupId,
      groupMemberId: p.groupMemberId,
      type: "OBLIGATION" as const,
      amount: -p.owedAmount,
      currency: "SAR",
      description: `حصة من مصروف: ${args.title}`,
      expenseId: expense.id,
    })),
  ];
  await db.ledgerEntry.createMany({ data: lines });
  return expense;
}

async function createPaymentRequest(
  requesterId: string,
  payerUserId: string,
  amount: number,
  reason: string,
  status: "PENDING" | "OVERDUE" | "PAID",
  dueDate?: Date,
) {
  await db.paymentRequest.create({
    data: {
      requesterId,
      payerUserId,
      amount,
      paidAmount: status === "PAID" ? amount : 0,
      currency: "SAR",
      reason,
      status,
      dueDate,
      secureToken: token(),
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
