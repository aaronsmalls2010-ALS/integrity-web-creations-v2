/**
 * Balance-forward maths. Pure and dependency-free so the same rules drive the
 * issue-time preview, the late-fee sweep and the invoice/PDF/email layouts.
 *
 * The authoritative roll happens in SQL (crm.roll_forward_balances, migration
 * 0010) so it is atomic; splitOutstanding mirrors its arithmetic exactly and is
 * what the "will roll forward" preview uses.
 */

export type LineKind = 'charge' | 'carry_forward' | 'late_fee';

export interface KindedLine {
  kind?: LineKind | string | null;
  amount_cents: number;
  sort_order?: number | null;
}

/**
 * Split what an invoice still owes into principal and late fee.
 *
 * Payments reduce principal first; the fee carries in full, capped at what is
 * still owed. 1000.00 + 15.00 fee, 500.00 paid  ->  balance 515.00 =
 * 500.00 principal + 15.00 fee.
 */
export function splitOutstanding(balanceCents: number, lateFeeLineCents: number) {
  const balance = Math.max(0, Math.trunc(balanceCents || 0));
  const fee = Math.min(balance, Math.max(0, Math.trunc(lateFeeLineCents || 0)));
  return { principalCents: balance - fee, lateFeeCents: fee };
}

/** Sum of the late-fee lines on an invoice (assessed here or carried in). */
export function lateFeeLinesTotal(lines: KindedLine[]): number {
  return lines.reduce((s, l) => (l.kind === 'late_fee' ? s + l.amount_cents : s), 0);
}

/**
 * The amount a new late fee is a percentage of: everything still owed EXCEPT
 * late fees already on the invoice. Without this a fee would be charged on a
 * fee, and the balance would compound every month it stayed unpaid.
 */
export function lateFeeBaseCents(balanceCents: number, lines: KindedLine[]): number {
  return splitOutstanding(balanceCents, lateFeeLinesTotal(lines)).principalCents;
}

/** Percentage fee, rounded to the cent. */
export function lateFeeAmountCents(baseCents: number, percent: number): number {
  if (!(percent > 0) || !(baseCents > 0)) return 0;
  return Math.round(baseCents * (percent / 100));
}

const KIND_RANK: Record<string, number> = { carry_forward: 0, charge: 1, late_fee: 2 };

/** Display order: previous balance first, this period's charges, then fees. */
export function orderLines<T extends KindedLine>(lines: T[]): T[] {
  return lines
    .slice()
    .sort((a, b) =>
      (KIND_RANK[a.kind ?? 'charge'] ?? 1) - (KIND_RANK[b.kind ?? 'charge'] ?? 1)
      || (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export interface LineSummary {
  /** This period's own charges. */
  chargesCents: number;
  /** Unpaid principal carried from earlier invoices. */
  carriedCents: number;
  /** Late fees on the invoice (assessed here or carried in). */
  lateFeeCents: number;
  /** True when anything was carried from an earlier invoice. */
  hasCarry: boolean;
}

export function summarizeLines(lines: KindedLine[]): LineSummary {
  let chargesCents = 0, carriedCents = 0, lateFeeCents = 0;
  for (const l of lines) {
    if (l.kind === 'carry_forward') carriedCents += l.amount_cents;
    else if (l.kind === 'late_fee') lateFeeCents += l.amount_cents;
    else chargesCents += l.amount_cents;
  }
  return { chargesCents, carriedCents, lateFeeCents, hasCarry: carriedCents > 0 };
}

/** One past-due invoice, as the issue-time preview sees it. */
export interface RolloverCandidate {
  id: string;
  invoice_number: string | null;
  due_date: string;
  balance_cents: number;
  lines: KindedLine[];
}

export interface RolloverPreview {
  count: number;
  principalCents: number;
  lateFeeCents: number;
  totalCents: number;
  items: Array<{ id: string; invoice_number: string | null; due_date: string; principalCents: number; lateFeeCents: number }>;
}

export function previewRollover(candidates: RolloverCandidate[]): RolloverPreview {
  const items = candidates.map((c) => {
    const s = splitOutstanding(c.balance_cents, lateFeeLinesTotal(c.lines));
    return { id: c.id, invoice_number: c.invoice_number, due_date: c.due_date, ...s };
  });
  const principalCents = items.reduce((s, i) => s + i.principalCents, 0);
  const lateFeeCents = items.reduce((s, i) => s + i.lateFeeCents, 0);
  return { count: items.length, principalCents, lateFeeCents, totalCents: principalCents + lateFeeCents, items };
}
