/**
 * Centralized client-side input validation.
 *
 * Each `validate*` helper returns a Turkish error string when invalid, or
 * `null` when the value passes. Screens feed the result straight into the
 * `Input` component's `error` prop. Rules live here (not inline per screen) so
 * limits stay consistent across the app.
 */

export const EMAIL_REGEX = /\S+@\S+\.\S+/;

/** Lenient minimum used when *checking* an existing password (login). */
export const MIN_PASSWORD_LENGTH = 6;
/** Stricter minimum enforced when *setting* a new password (register, change). */
export const MIN_NEW_PASSWORD_LENGTH = 8;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 60;

export const MIN_GROUP_NAME_LENGTH = 2;
export const MAX_GROUP_NAME_LENGTH = 50;
export const MAX_GROUP_DESCRIPTION_LENGTH = 280;

export const MAX_EXPENSE_AMOUNT = 1_000_000;
export const MAX_TITLE_LENGTH = 100;

/**
 * Tolerance when comparing two money sums (one kuruş).
 *
 * Amounts are stored as `numeric(12,2)`, so an equal split can drift by at most
 * a single kuruş of rounding. Anything larger is a real mismatch. The same
 * value is enforced server-side by `validate_expense_allocations`; keeping the
 * client looser than the server only turns a fixable form error into an opaque
 * RPC rejection.
 */
export const MONEY_EPSILON = 0.01;

/**
 * True when two money amounts are equal within `MONEY_EPSILON`.
 *
 * Compared in whole kuruş: as floats, `100.01 - 100` is 0.010000000000005, so a
 * one-kuruş gap passed at ₺10 but failed at ₺100, while the server (exact
 * `numeric`) accepts it at every magnitude.
 */
export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(Math.round(a * 100) - Math.round(b * 100)) <= Math.round(MONEY_EPSILON * 100);
}

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'E-posta adresi gerekli.';
  if (!EMAIL_REGEX.test(value)) return 'Geçerli bir e-posta adresi girin.';
  return null;
}

/** For logging in with an already-created password — kept lenient. */
export function validateLoginPassword(password: string): string | null {
  if (!password) return 'Şifre gerekli.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`;
  }
  return null;
}

/** For setting a new password (register / change password) — stricter. */
export function validateNewPassword(password: string): string | null {
  if (!password) return 'Şifre gerekli.';
  if (password.length < MIN_NEW_PASSWORD_LENGTH) {
    return `Şifre en az ${MIN_NEW_PASSWORD_LENGTH} karakter olmalıdır.`;
  }
  if (!/[A-Za-zğüşöçıİĞÜŞÖÇ]/.test(password) || !/[0-9]/.test(password)) {
    return 'Şifre en az bir harf ve bir rakam içermelidir.';
  }
  return null;
}

export type PasswordStrength = {
  /** 0–4 */
  score: number;
  label: 'Çok zayıf' | 'Zayıf' | 'Orta' | 'Güçlü';
};

/** Lightweight strength estimate for a live meter/hint. */
export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= MIN_NEW_PASSWORD_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[A-Za-zğüşöçıİĞÜŞÖÇ]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const label: PasswordStrength['label'] =
    score <= 1 ? 'Çok zayıf' : score === 2 ? 'Zayıf' : score === 3 ? 'Orta' : 'Güçlü';
  return { score, label };
}

export function validateDisplayName(name: string): string | null {
  const value = name.trim();
  if (value.length < MIN_NAME_LENGTH) {
    return `Ad Soyad en az ${MIN_NAME_LENGTH} karakter olmalıdır.`;
  }
  if (value.length > MAX_NAME_LENGTH) {
    return `Ad Soyad en fazla ${MAX_NAME_LENGTH} karakter olabilir.`;
  }
  return null;
}

export function validateGroupName(name: string): string | null {
  const value = name.trim();
  if (value.length < MIN_GROUP_NAME_LENGTH) {
    return `Grup adı en az ${MIN_GROUP_NAME_LENGTH} karakter olmalıdır.`;
  }
  if (value.length > MAX_GROUP_NAME_LENGTH) {
    return `Grup adı en fazla ${MAX_GROUP_NAME_LENGTH} karakter olabilir.`;
  }
  return null;
}

export function validateExpenseTitle(title: string): string | null {
  const value = title.trim();
  if (!value) return 'Başlık gerekli.';
  if (value.length > MAX_TITLE_LENGTH) {
    return `Başlık en fazla ${MAX_TITLE_LENGTH} karakter olabilir.`;
  }
  return null;
}

/** Strip everything except digits and a single decimal separator variant. */
export function sanitizeAmountInput(raw: string): string {
  return raw.replace(/[^0-9.,]/g, '');
}

/**
 * Parse a user-entered amount into a number, NaN when it cannot be read safely.
 *
 * Accepts Turkish and English notation ("1.234,56", "1,234.56", "1234.56"). One
 * or two digits after the last separator make it the decimal point; three make
 * every separator thousands grouping ("1.234" is 1234, the way a Turkish user
 * means it). Anything that fits neither reading ("1.234.56", "12.3456") is NaN
 * rather than a guess, so the form shows an error instead of saving a wrong sum.
 * A trailing separator ("12,") reads as the integer, so typing stays live.
 */
export function parseAmount(raw: string): number {
  let text = raw.trim();
  if (/[.,]$/.test(text)) text = text.slice(0, -1);
  if (/^[.,]/.test(text)) text = `0${text}`;
  if (!/^\d[\d.,]*$/.test(text)) return NaN;

  const last = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','));
  const decimals = last === -1 ? 0 : text.length - last - 1;
  const [whole, fraction] = decimals > 0 && decimals <= 2 ? [text.slice(0, last), text.slice(last + 1)] : [text, ''];

  const groupSeparators = new Set(whole.match(/[.,]/g) ?? []);
  if (groupSeparators.size > 1) return NaN;
  if (fraction && groupSeparators.has(text[last])) return NaN;
  if (groupSeparators.size === 1 && !/^\d{1,3}([.,]\d{3})+$/.test(whole)) return NaN;

  return Number(`${whole.replace(/[.,]/g, '')}${fraction ? `.${fraction}` : ''}`);
}

export type AmountResult = { value: number; error: null } | { value: null; error: string };

export function validateAmount(
  raw: string,
  { max = MAX_EXPENSE_AMOUNT }: { max?: number } = {},
): AmountResult {
  const num = parseAmount(raw);
  if (Number.isNaN(num) || num <= 0) {
    return { value: null, error: 'Geçerli bir tutar girin.' };
  }
  if (num > max) {
    return { value: null, error: `Tutar ${max.toLocaleString('tr-TR')} değerini aşamaz.` };
  }
  return { value: num, error: null };
}
