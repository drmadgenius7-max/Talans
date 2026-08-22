import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { conflict, notFound } from '@/lib/errors';
import { generateLinkToken, generateVerificationId, sha256Hex } from '@/lib/security/crypto';
import { findCountry } from '@/lib/i18n/countries';
import { normalizeOrderNumber } from '@/lib/utils';
import { logger } from '@/lib/logger';

export type CreateOrderInput = {
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  showCustomerName?: boolean;
  countryCode: string;
  serviceType?: string | null;
  executionDate: Date;
  status?: OrderStatus;
  notes?: string | null;
  createdById?: string | null;
};

/**
 * Creates an order together with its verification link.
 *
 * The link is created in the same transaction as the order so every order is
 * publicly verifiable from the moment it exists — there is no window in which
 * an order has documentation but no way to verify it.
 */
export async function createOrder(input: CreateOrderInput) {
  const orderNumber = normalizeOrderNumber(input.orderNumber);
  if (!orderNumber) throw conflict('رقم الطلب مطلوب.');

  const country = findCountry(input.countryCode);

  const existing = await prisma.order.findUnique({ where: { orderNumber } });
  if (existing) throw conflict(`رقم الطلب ${orderNumber} مسجّل مسبقًا.`);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        showCustomerName: input.showCustomerName ?? false,
        countryCode: input.countryCode.toUpperCase(),
        countryNameAr: country?.nameAr ?? input.countryCode,
        serviceType: input.serviceType?.trim() || null,
        executionDate: input.executionDate,
        status: input.status ?? 'EXECUTED',
        notes: input.notes?.trim() || null,
        createdById: input.createdById ?? null,
      },
    });

    const link = await createLinkForOrder(tx, order.id, input.createdById ?? null);
    return { order, link };
  });
}

/** Retries on the astronomically unlikely id collision rather than failing. */
async function createLinkForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  createdById: string | null,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const verificationId = generateVerificationId();
    const token = generateLinkToken();
    try {
      return await tx.verificationLink.create({
        data: {
          orderId,
          verificationId,
          token,
          tokenHash: sha256Hex(token),
          createdById,
        },
      });
    } catch (err) {
      if (attempt === 4) throw err;
      logger.warn('verification_id_collision', { attempt });
    }
  }
  throw new Error('تعذر إنشاء رابط تحقق فريد.');
}

export type UpdateOrderInput = Partial<
  Omit<CreateOrderInput, 'orderNumber' | 'createdById'> & { orderNumber: string }
>;

export async function updateOrder(id: string, input: UpdateOrderInput) {
  const order = await prisma.order.findFirst({ where: { id, deletedAt: null } });
  if (!order) throw notFound('الطلب غير موجود.');

  const data: Prisma.OrderUpdateInput = {};

  if (input.orderNumber !== undefined) {
    const orderNumber = normalizeOrderNumber(input.orderNumber);
    if (orderNumber !== order.orderNumber) {
      const clash = await prisma.order.findUnique({ where: { orderNumber } });
      if (clash) throw conflict(`رقم الطلب ${orderNumber} مسجّل مسبقًا.`);
      data.orderNumber = orderNumber;
    }
  }
  if (input.customerName !== undefined) data.customerName = input.customerName?.trim() || null;
  if (input.customerPhone !== undefined) data.customerPhone = input.customerPhone?.trim() || null;
  if (input.showCustomerName !== undefined) data.showCustomerName = input.showCustomerName;
  if (input.countryCode !== undefined) {
    data.countryCode = input.countryCode.toUpperCase();
    data.countryNameAr = findCountry(input.countryCode)?.nameAr ?? input.countryCode;
  }
  if (input.serviceType !== undefined) data.serviceType = input.serviceType?.trim() || null;
  if (input.executionDate !== undefined) data.executionDate = input.executionDate;
  if (input.status !== undefined) data.status = input.status;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  return prisma.order.update({ where: { id }, data });
}

/**
 * Soft delete.
 *
 * Documentation fingerprints are evidence: an order that was verified in the
 * past must remain auditable even after staff remove it from the dashboard, so
 * rows are marked deleted rather than destroyed, and the public link is
 * deactivated so customers stop seeing it.
 */
export async function softDeleteOrder(id: string) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({ where: { id }, data: { deletedAt: now } });
    await tx.documentation.updateMany({ where: { orderId: id }, data: { deletedAt: now } });
    await tx.verificationLink.updateMany({ where: { orderId: id }, data: { isActive: false } });
    return order;
  });
}

export async function restoreOrder(id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({ where: { id }, data: { deletedAt: null } });
    await tx.documentation.updateMany({ where: { orderId: id }, data: { deletedAt: null } });
    await tx.verificationLink.updateMany({ where: { orderId: id }, data: { isActive: true } });
    return order;
  });
}

export type ListOrdersInput = {
  search?: string;
  countryCode?: string;
  status?: OrderStatus;
  from?: Date;
  to?: Date;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listOrders(input: ListOrdersInput = {}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

  const where: Prisma.OrderWhereInput = {
    ...(input.includeDeleted ? {} : { deletedAt: null }),
    ...(input.countryCode ? { countryCode: input.countryCode.toUpperCase() } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.from || input.to
      ? { executionDate: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } }
      : {}),
    ...(input.search
      ? {
          OR: [
            { orderNumber: { contains: normalizeOrderNumber(input.search), mode: 'insensitive' } },
            { customerName: { contains: input.search.trim(), mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        documentation: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        verificationLinks: { take: 1, orderBy: { createdAt: 'asc' } },
        _count: { select: { verificationChecks: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      documentation: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      verificationLinks: { orderBy: { createdAt: 'asc' } },
      createdBy: { select: { id: true, name: true, email: true } },
      verificationChecks: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!order) throw notFound('الطلب غير موجود.');
  return order;
}

/** Lookup used by the customer-facing search box. */
export async function findOrderForPublic(orderNumberRaw: string) {
  const orderNumber = normalizeOrderNumber(orderNumberRaw);
  if (!orderNumber) return null;

  return prisma.order.findFirst({
    where: { orderNumber, deletedAt: null },
    include: {
      documentation: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      },
      verificationLinks: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
    },
  });
}
