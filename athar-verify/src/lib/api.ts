import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest } from './errors';
import { serializeBigInt } from './db/prisma';

export type ApiOk<T> = { ok: true; data: T };

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiOk<T>> {
  return NextResponse.json<ApiOk<T>>({ ok: true, data: serializeBigInt(data) }, init);
}

/** Parses and validates a JSON request body. */
export async function readJson<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest('صيغة الطلب غير صالحة — المتوقع JSON.');
  }
  return schema.parse(body);
}

/** Parses query-string parameters. */
export function readQuery<S extends z.ZodTypeAny>(req: Request, schema: S): z.infer<S> {
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return schema.parse(raw);
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** No-store headers for anything containing customer data. */
export const NO_STORE: ResponseInit = {
  headers: {
    'cache-control': 'no-store, no-cache, must-revalidate, private',
    pragma: 'no-cache',
  },
};
