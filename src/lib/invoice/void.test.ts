import { describe, it, expect } from 'vitest';
import { decideVoid, refusalMessage, normalizeReason, MAX_REASON_LENGTH } from './void';

describe('decideVoid', () => {
  it('voids an issued invoice and keeps the record', () => {
    expect(decideVoid({ status: 'sent', amountPaidCents: 0 }))
      .toEqual({ allowed: true, action: 'void' });
    expect(decideVoid({ status: 'viewed', amountPaidCents: 0 }))
      .toEqual({ allowed: true, action: 'void' });
    expect(decideVoid({ status: 'overdue', amountPaidCents: 0 }))
      .toEqual({ allowed: true, action: 'void' });
  });

  it('deletes a draft, because no number was ever issued', () => {
    expect(decideVoid({ status: 'draft', amountPaidCents: 0 }))
      .toEqual({ allowed: true, action: 'delete_draft' });
  });

  // The gap this file exists to close: the UI hid these cases, the API did not.
  it('refuses a paid invoice', () => {
    expect(decideVoid({ status: 'paid', amountPaidCents: 75000 }))
      .toEqual({ allowed: false, reason: 'has_payments' });
  });

  it('refuses a part paid invoice', () => {
    expect(decideVoid({ status: 'partial', amountPaidCents: 25000 }))
      .toEqual({ allowed: false, reason: 'has_payments' });
  });

  it('refuses ANY invoice carrying a payment, whatever its status says', () => {
    // A payment recorded against a still-"sent" invoice is exactly the case a
    // status check on its own would wave through.
    expect(decideVoid({ status: 'sent', amountPaidCents: 1 }))
      .toEqual({ allowed: false, reason: 'has_payments' });
  });

  it('refuses an invoice that is already void', () => {
    expect(decideVoid({ status: 'void', amountPaidCents: 0 }))
      .toEqual({ allowed: false, reason: 'already_void' });
  });

  it('refuses a status it does not recognise rather than guessing', () => {
    expect(decideVoid({ status: 'pending' as never, amountPaidCents: 0 }))
      .toEqual({ allowed: false, reason: 'unknown_status' });
  });

  it('every refusal has plain wording that explains the alternative', () => {
    for (const r of ['already_void', 'has_payments', 'unknown_status'] as const) {
      const msg = refusalMessage(r);
      expect(msg.length).toBeGreaterThan(15);
      expect(msg).not.toMatch(/error|invalid|failed/i);
    }
  });
});

describe('normalizeReason', () => {
  it('keeps a real reason and tidies the whitespace', () => {
    expect(normalizeReason('  wrong   amount  ')).toBe('wrong amount');
  });

  it('rejects nothing, blank, and anything too short to mean something', () => {
    expect(normalizeReason(undefined)).toBeNull();
    expect(normalizeReason('')).toBeNull();
    expect(normalizeReason('   ')).toBeNull();
    expect(normalizeReason('x')).toBeNull();
  });

  it('rejects a non string rather than coercing it', () => {
    expect(normalizeReason(42)).toBeNull();
    expect(normalizeReason({})).toBeNull();
  });

  it('caps a very long reason instead of storing it whole', () => {
    const out = normalizeReason('a'.repeat(1000));
    expect(out).not.toBeNull();
    expect(out!.length).toBe(MAX_REASON_LENGTH);
  });
});
