import { describe, expect, it } from '@jest/globals';
import { parseNumeric } from './numeric';

describe('parseNumeric', () => {
  it('reads PostgREST numeric strings', () => {
    expect(parseNumeric('50.00')).toBe(50);
    expect(parseNumeric('1533.33')).toBe(1533.33);
    expect(parseNumeric('-0.01')).toBe(-0.01);
  });

  it('passes finite numbers through', () => {
    expect(parseNumeric(12.5)).toBe(12.5);
  });

  it('never returns NaN or Infinity', () => {
    expect(parseNumeric(null)).toBe(0);
    expect(parseNumeric(undefined)).toBe(0);
    expect(parseNumeric('')).toBe(0);
    expect(parseNumeric('abc')).toBe(0);
    expect(parseNumeric(Number.NaN)).toBe(0);
    expect(parseNumeric(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('keeps a balance sheet numeric when summing database rows', () => {
    const total = ['50.00', '25.50', '0.25'].reduce((acc, v) => acc + parseNumeric(v), 0);
    expect(total).toBe(75.75);
  });
});
