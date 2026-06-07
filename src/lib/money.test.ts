import { describe, it, expect } from 'vitest';
import { formatUSD, dollarsToCents, centsToDollars, addCents } from './money';

describe('money', () => {
  it('formats cents as USD', () => {
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(3500)).toBe('$35.00');
    expect(formatUSD(199999)).toBe('$1,999.99');
  });
  it('parses dollar strings to integer cents', () => {
    expect(dollarsToCents('35')).toBe(3500);
    expect(dollarsToCents('35.5')).toBe(3550);
    expect(dollarsToCents('1,999.99')).toBe(199999);
    expect(dollarsToCents('')).toBe(0);
  });
  it('round-trips without float drift', () => {
    expect(centsToDollars(199999)).toBe('1999.99');
  });
  it('adds a list of cents safely', () => {
    expect(addCents([1001, 2002, 3003])).toBe(6006);
  });
  it('rejects negative or non-numeric input', () => {
    expect(() => dollarsToCents('abc')).toThrow();
    expect(() => dollarsToCents('-5')).toThrow();
  });
});
