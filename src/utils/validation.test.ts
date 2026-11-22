import { describe, expect, it } from '@jest/globals';
import { amountsMatch, MAX_EXPENSE_AMOUNT, MONEY_EPSILON, parseAmount, sanitizeAmountInput, validateAmount } from './validation';

describe('parseAmount', () => {
  it('accepts a comma or a dot as the decimal separator', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('12.50')).toBe(12.5);
    expect(parseAmount('100')).toBe(100);
  });

  it('returns NaN for input that is not a number', () => {
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount(',')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
  });

  // A pasted "1.234,56" used to save as ₺1,23 with no error.
  it('reads thousands separators in Turkish and English notation', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1.234.567,8')).toBe(1234567.8);
    expect(parseAmount('1.234')).toBe(1234);
    expect(parseAmount('1,234,567')).toBe(1234567);
  });

  it('keeps what the screens prefill and what typing passes through', () => {
    expect(parseAmount(String(1234.5))).toBe(1234.5); // receipt scan / edit prefill
    expect(parseAmount('12,')).toBe(12);
    expect(parseAmount(',5')).toBe(0.5);
    expect(parseAmount('0')).toBe(0);
  });

  it('rejects ambiguous input instead of guessing', () => {
    expect(parseAmount('1.234.56')).toBeNaN();
    expect(parseAmount('1,23,45')).toBeNaN();
    expect(parseAmount('12.3456')).toBeNaN();
    expect(parseAmount('1.2.3')).toBeNaN();
    expect(parseAmount('12a')).toBeNaN();
  });
});

describe('sanitizeAmountInput', () => {
  it('keeps only digits and separators', () => {
    expect(sanitizeAmountInput('₺ 1 234,5a')).toBe('1234,5');
  });
});

describe('validateAmount', () => {
  it('accepts a positive amount', () => {
    expect(validateAmount('33,34')).toEqual({ value: 33.34, error: null });
  });

  it('rejects zero, negatives and garbage', () => {
    expect(validateAmount('0').error).not.toBeNull();
    expect(validateAmount('-5').error).not.toBeNull();
    expect(validateAmount('').error).not.toBeNull();
  });

  it('enforces the maximum', () => {
    expect(validateAmount(String(MAX_EXPENSE_AMOUNT)).error).toBeNull();
    expect(validateAmount(String(MAX_EXPENSE_AMOUNT + 1)).error).not.toBeNull();
  });
});

describe('amountsMatch', () => {
  // Must stay in step with the server's tolerance in validate_expense_allocations.
  it('uses a one-kuruş tolerance', () => {
    expect(MONEY_EPSILON).toBe(0.01);
  });

  it('absorbs the rounding of an equal split', () => {
    expect(amountsMatch(33.34 + 33.33 + 33.33, 100)).toBe(true);
    expect(amountsMatch(0.1 + 0.2, 0.3)).toBe(true);
    expect(amountsMatch(100, 100.01)).toBe(true);
  });

  // A float compare passed this gap at ₺10 and failed it at ₺100.
  it('treats one kuruş the same at every magnitude', () => {
    for (const total of [10, 99.99, 100, 1533.33, 999_999.99]) {
      expect(amountsMatch(total, total + 0.01)).toBe(true);
      expect(amountsMatch(total + 0.01, total)).toBe(true);
    }
  });

  it('rejects a real mismatch', () => {
    expect(amountsMatch(100, 100.02)).toBe(false);
    expect(amountsMatch(99.97, 100)).toBe(false);
  });
});
