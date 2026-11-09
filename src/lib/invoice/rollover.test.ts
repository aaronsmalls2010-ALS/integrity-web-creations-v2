import { describe, it, expect } from 'vitest';
import {
  splitOutstanding, lateFeeBaseCents, lateFeeAmountCents, lateFeeLinesTotal,
  orderLines, summarizeLines, previewRollover,
} from './rollover';

describe('splitOutstanding', () => {
  it('separates the late fee from principal', () => {
    expect(splitOutstanding(101_500, 1_500)).toEqual({ principalCents: 100_000, lateFeeCents: 1_500 });
  });

  it('payments reduce principal first, the fee carries in full', () => {
    // 1000.00 + 15.00 fee, 500.00 paid -> 515.00 owed
    expect(splitOutstanding(51_500, 1_500)).toEqual({ principalCents: 50_000, lateFeeCents: 1_500 });
  });

  it('never carries more fee than is still owed', () => {
    // Paid down to 10.00 owed; the 15.00 fee can only be 10.00 of that.
    expect(splitOutstanding(1_000, 1_500)).toEqual({ principalCents: 0, lateFeeCents: 1_000 });
  });

  it('handles no fee, zero and garbage', () => {
    expect(splitOutstanding(25_000, 0)).toEqual({ principalCents: 25_000, lateFeeCents: 0 });
    expect(splitOutstanding(0, 500)).toEqual({ principalCents: 0, lateFeeCents: 0 });
    expect(splitOutstanding(-5, -5)).toEqual({ principalCents: 0, lateFeeCents: 0 });
  });

  it('always adds back up to the balance', () => {
    for (const [bal, fee] of [[1, 0], [99_999, 1_234], [500, 500], [500, 9_999], [0, 0]]) {
      const s = splitOutstanding(bal, fee);
      expect(s.principalCents + s.lateFeeCents).toBe(bal);
    }
  });
});

describe('late fee base — no fee on a fee', () => {
  const carried = [
    { kind: 'carry_forward', amount_cents: 100_000 },
    { kind: 'late_fee', amount_cents: 1_500 },
    { kind: 'charge', amount_cents: 50_000 },
  ];

  it('excludes late-fee lines already on the invoice', () => {
    // balance 151,500 = 100,000 carried + 1,500 fee + 50,000 new
    expect(lateFeeLinesTotal(carried)).toBe(1_500);
    expect(lateFeeBaseCents(151_500, carried)).toBe(150_000);
  });

  it('a second month at 1.5% charges on principal only', () => {
    expect(lateFeeAmountCents(lateFeeBaseCents(151_500, carried), 1.5)).toBe(2_250);
  });

  it('is unchanged for an invoice with no fees', () => {
    expect(lateFeeBaseCents(50_000, [{ kind: 'charge', amount_cents: 50_000 }])).toBe(50_000);
  });

  it('treats lines without a kind as ordinary charges (pre-migration rows)', () => {
    expect(lateFeeBaseCents(20_000, [{ amount_cents: 20_000 }])).toBe(20_000);
  });
});

describe('lateFeeAmountCents', () => {
  it('rounds to the cent and ignores non-positive input', () => {
    expect(lateFeeAmountCents(33_333, 1.5)).toBe(500);
    expect(lateFeeAmountCents(0, 1.5)).toBe(0);
    expect(lateFeeAmountCents(10_000, 0)).toBe(0);
    expect(lateFeeAmountCents(10_000, -2)).toBe(0);
  });
});

describe('orderLines / summarizeLines', () => {
  const lines = [
    { kind: 'late_fee', amount_cents: 1_500, sort_order: 3 },
    { kind: 'charge', amount_cents: 50_000, sort_order: 1 },
    { kind: 'carry_forward', amount_cents: 100_000, sort_order: 2 },
    { amount_cents: 7_000, sort_order: 0 },
  ];

  it('shows previous balance, then charges, then fees', () => {
    expect(orderLines(lines).map((l) => l.amount_cents)).toEqual([100_000, 7_000, 50_000, 1_500]);
  });

  it('does not mutate its input', () => {
    const copy = [...lines];
    orderLines(lines);
    expect(lines).toEqual(copy);
  });

  it('summarises the three buckets', () => {
    expect(summarizeLines(lines)).toEqual({
      chargesCents: 57_000, carriedCents: 100_000, lateFeeCents: 1_500, hasCarry: true,
    });
    expect(summarizeLines([{ amount_cents: 100 }]).hasCarry).toBe(false);
  });
});

describe('previewRollover', () => {
  it('matches what the SQL function will carry', () => {
    const p = previewRollover([
      { id: 'a', invoice_number: 'IWC-1001', due_date: '2026-10-15', balance_cents: 101_500,
        lines: [{ kind: 'charge', amount_cents: 100_000 }, { kind: 'late_fee', amount_cents: 1_500 }] },
      { id: 'b', invoice_number: 'IWC-1002', due_date: '2026-10-20', balance_cents: 30_000,
        lines: [{ kind: 'charge', amount_cents: 30_000 }] },
    ]);
    expect(p.count).toBe(2);
    expect(p.principalCents).toBe(130_000);
    expect(p.lateFeeCents).toBe(1_500);
    expect(p.totalCents).toBe(131_500);
  });

  it('is empty when nothing is past due', () => {
    expect(previewRollover([])).toMatchObject({ count: 0, totalCents: 0 });
  });
});
