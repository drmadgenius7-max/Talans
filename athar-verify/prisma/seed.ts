import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Seed data.
 *
 * Creates the first admin account and a small set of demo orders with
 * *synthetic* documentation rows — real videos are not shipped in the repo, so
 * the seeded fingerprints are deterministic placeholders. That is enough to
 * exercise the dashboard, the public pages, and the QR flow end to end; upload
 * a real file through the admin UI to exercise the media pipeline.
 *
 * Safe to re-run: every write is an upsert keyed on a natural key.
 */

const prisma = new PrismaClient();

const TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function token(length: number): string {
  let out = '';
  for (const byte of randomBytes(length)) out += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
  return out;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const DEMO_ORDERS = [
  {
    orderNumber: '275123456',
    customerName: 'أحمد بن سالم',
    countryCode: 'TD',
    countryNameAr: 'تشاد',
    serviceType: 'توزيع مصاحف',
    executionDate: new Date('2026-08-18T00:00:00.000Z'),
    notes: 'تم التوزيع في ثلاث قرى بمحيط أنجمينا.',
    filename: 'athar-td-275123456.mp4',
    filesize: 48_233_984,
    duration: 96.4,
  },
  {
    orderNumber: '275123457',
    customerName: 'نورة العتيبي',
    countryCode: 'NE',
    countryNameAr: 'النيجر',
    serviceType: 'توزيع كتب',
    executionDate: new Date('2026-08-11T00:00:00.000Z'),
    notes: null,
    filename: 'athar-ne-275123457.mp4',
    filesize: 62_119_402,
    duration: 128.9,
  },
  {
    orderNumber: '275123458',
    customerName: null,
    countryCode: 'ML',
    countryNameAr: 'مالي',
    serviceType: 'وقف مصاحف',
    executionDate: new Date('2026-07-29T00:00:00.000Z'),
    notes: 'بانتظار رفع التوثيق الميداني.',
    filename: null,
    filesize: 0,
    duration: 0,
  },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@athrr-sa.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
  const name = process.env.SEED_ADMIN_NAME ?? 'مدير النظام';

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { name, role: 'OWNER', isActive: true },
    create: { email, name, role: 'OWNER', passwordHash: await bcrypt.hash(password, 12) },
  });

  console.log(`✔ حساب الإدارة جاهز: ${admin.email}`);

  for (const demo of DEMO_ORDERS) {
    const order = await prisma.order.upsert({
      where: { orderNumber: demo.orderNumber },
      update: {},
      create: {
        orderNumber: demo.orderNumber,
        customerName: demo.customerName,
        showCustomerName: false,
        countryCode: demo.countryCode,
        countryNameAr: demo.countryNameAr,
        serviceType: demo.serviceType,
        executionDate: demo.executionDate,
        status: demo.filename ? 'EXECUTED' : 'PENDING',
        notes: demo.notes,
        createdById: admin.id,
      },
    });

    const existingLink = await prisma.verificationLink.findFirst({ where: { orderId: order.id } });
    const link =
      existingLink ??
      (await (async () => {
        const linkToken = token(10);
        return prisma.verificationLink.create({
          data: {
            orderId: order.id,
            verificationId: `ATH-${token(8)}`,
            token: linkToken,
            tokenHash: sha256(linkToken),
            createdById: admin.id,
          },
        });
      })());

    if (demo.filename) {
      const existingDoc = await prisma.documentation.findFirst({ where: { orderId: order.id } });
      if (!existingDoc) {
        await prisma.documentation.create({
          data: {
            orderId: order.id,
            kind: 'VIDEO',
            storageKey: `documentation/2026/08/seed-${demo.orderNumber}.mp4`,
            storageDriver: process.env.STORAGE_DRIVER ?? 'local',
            originalFilename: demo.filename,
            // Deterministic placeholder: no real file backs this row.
            sha256: sha256(`athar-seed:${demo.orderNumber}`),
            filesize: BigInt(demo.filesize),
            mimeType: 'video/mp4',
            durationSeconds: demo.duration,
            uploadedById: admin.id,
            // Left PENDING on purpose — there is no object in storage to
            // process, and marking it READY would imply fingerprints exist.
            processingStatus: 'PENDING',
            processingError: 'بيانات تجريبية — لا يوجد ملف فعلي في التخزين.',
          },
        });
      }
    }

    console.log(
      `✔ طلب ${order.orderNumber} — /v/${link.verificationId}?t=${link.token}`,
    );
  }

  console.log('\nتم إنشاء بيانات التجربة بنجاح.');
  console.log(`سجّل الدخول من /admin/login باستخدام: ${email}`);
  if (password === 'ChangeMe!2026') {
    console.log('⚠ غيّر كلمة مرور الإدارة الافتراضية قبل النشر.');
  }
}

main()
  .catch((err) => {
    console.error('فشل إنشاء بيانات التجربة:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
