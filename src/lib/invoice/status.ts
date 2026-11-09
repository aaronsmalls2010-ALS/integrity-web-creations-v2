export type InvoiceStatus = 'draft'|'sent'|'viewed'|'partial'|'paid'|'overdue'|'void'|'rolled';
export interface RecomputeInput { totalCents: number; currentStatus: InvoiceStatus; }
export interface Recompute { amountPaidCents: number; balanceCents: number; status: InvoiceStatus; }

export function applyPayments(inv: RecomputeInput, payments: { amount_cents: number }[]): Recompute {
  const amountPaidCents = payments.reduce((s, p) => s + p.amount_cents, 0);
  const balanceCents = Math.max(0, inv.totalCents - amountPaidCents);
  // 'rolled' is closed: a late payment is still recorded, but the status stays put
  // (the balance now lives on the invoice it was carried to).
  if (inv.currentStatus === 'void' || inv.currentStatus === 'draft' || inv.currentStatus === 'rolled') {
    return { amountPaidCents, balanceCents, status: inv.currentStatus };
  }
  let status: InvoiceStatus = inv.currentStatus;
  if (balanceCents === 0 && amountPaidCents > 0) status = 'paid';
  else if (amountPaidCents > 0) status = 'partial';
  return { amountPaidCents, balanceCents, status };
}
