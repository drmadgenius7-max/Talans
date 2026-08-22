import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

/**
 * Application errors carry an Arabic, customer-safe message plus an HTTP
 * status. Anything that is *not* an AppError is treated as unexpected: it is
 * logged with full detail and reported to the client as a generic failure so
 * internal details never leak.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code: string = 'BAD_REQUEST',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new AppError(msg, 400, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'مطلوب تسجيل الدخول.') => new AppError(msg, 401, 'UNAUTHORIZED');
export const forbidden = (msg = 'لا تملك صلاحية لهذا الإجراء.') => new AppError(msg, 403, 'FORBIDDEN');
export const notFound = (msg = 'العنصر المطلوب غير موجود.') => new AppError(msg, 404, 'NOT_FOUND');
export const conflict = (msg: string) => new AppError(msg, 409, 'CONFLICT');
export const tooLarge = (msg: string) => new AppError(msg, 413, 'PAYLOAD_TOO_LARGE');
export const tooManyRequests = (msg = 'عدد المحاولات كبير. حاول مجددًا بعد قليل.', retryAfter?: number) =>
  new AppError(msg, 429, 'RATE_LIMITED', { retryAfter });
export const serverError = (msg = 'حدث خطأ غير متوقع. حاول لاحقًا.') =>
  new AppError(msg, 500, 'INTERNAL_ERROR');

export type ApiErrorBody = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

/** Converts any thrown value into a safe JSON response. */
export function toErrorResponse(err: unknown, route?: string): NextResponse<ApiErrorBody> {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return NextResponse.json<ApiErrorBody>(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'البيانات المُرسلة غير صالحة.', details } },
      { status: 422 },
    );
  }

  if (err instanceof AppError) {
    const headers: Record<string, string> = {};
    const retryAfter = (err.details as { retryAfter?: number } | undefined)?.retryAfter;
    if (err.status === 429 && retryAfter) headers['Retry-After'] = String(Math.ceil(retryAfter));
    return NextResponse.json<ApiErrorBody>(
      { ok: false, error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status, headers },
    );
  }

  logger.error('unhandled_error', { route, err });
  return NextResponse.json<ApiErrorBody>(
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'حدث خطأ غير متوقع. حاول لاحقًا.' } },
    { status: 500 },
  );
}

/** Wraps a route handler so every thrown error becomes a clean JSON response. */
export function withErrorHandling<Args extends unknown[]>(
  route: string,
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return toErrorResponse(err, route);
    }
  };
}
