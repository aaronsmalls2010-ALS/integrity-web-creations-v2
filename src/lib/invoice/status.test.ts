import { describe, it, expect } from 'vitest';
import { applyPayments } from './status';

describe('applyPayments', () => {
  it('marks paid at zero balance', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'sent' }, [{ amount_cents: 10000 }]);
    expect(r).toEqual({ amountPaidCents: 10000, balanceCents: 0, status: 'paid' });
  });
  it('marks partial when underpaid', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'sent' }, [{ amount_cents: 4000 }]);
    expect(r.status).toBe('partial'); expect(r.balanceCents).toBe(6000);
  });
  it('keeps void untouched', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'void' }, [{ amount_cents: 10000 }]);
    expect(r.status).toBe('void');
  });
  it('handles overpayment as paid with zero balance floor', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'viewed' }, [{ amount_cents: 12000 }]);
    expect(r.status).toBe('paid'); expect(r.balanceCents).toBe(0);
  });
});
