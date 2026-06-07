import { describe, it, expect } from 'vitest';
import { lineAmount, computeTotals } from './totals';

describe('invoice totals', () => {
  it('computes a line amount in cents', () => {
    expect(lineAmount(3, 3500)).toBe(10500);
  });
  it('sums subtotal, applies discount then tax on taxable lines', () => {
    const r = computeTotals({
      lines: [
        { quantity: 1, unit_price_cents: 250000, taxable: false },
        { quantity: 2, unit_price_cents: 3500, taxable: true },
      ],
      taxRate: 0.07,
      discountCents: 5000,
    });
    expect(r.subtotalCents).toBe(257000);
    expect(r.discountCents).toBe(5000);
    expect(r.taxCents).toBe(490);
    expect(r.totalCents).toBe(257000 - 5000 + 490);
  });
  it('never returns negative total', () => {
    const r = computeTotals({ lines: [{ quantity: 1, unit_price_cents: 1000, taxable: false }], taxRate: 0, discountCents: 99999 });
    expect(r.totalCents).toBe(0);
  });
});
