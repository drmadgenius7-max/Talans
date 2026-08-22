import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Password policy for admin accounts. Deliberately simple and explicit — these
 * are a handful of staff accounts with access to every customer's
 * documentation, so the bar is length first.
 */
export function validatePasswordStrength(plain: string): { ok: boolean; message?: string } {
  if (plain.length < 10) return { ok: false, message: 'كلمة المرور يجب أن تكون 10 أحرف على الأقل.' };
  if (plain.length > 200) return { ok: false, message: 'كلمة المرور طويلة جدًا.' };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(plain)).length;
  if (classes < 3) {
    return {
      ok: false,
      message: 'استخدم مزيجًا من الأحرف الكبيرة والصغيرة والأرقام أو الرموز (٣ أنواع على الأقل).',
    };
  }
  return { ok: true };
}

/** Burns time on a non-existent account so login timing does not leak emails. */
export async function dummyVerify(): Promise<void> {
  await bcrypt.compare(
    'not-a-real-password',
    '$2a$12$C6UzMDM.H6dfI/f/IKcEe.4YRZ3Zx3E4L8CzXpQ0kQOZ3Qx1lFq2i',
  );
}
