export interface TotalsLine { quantity: number; unit_price_cents: number; taxable: boolean; }
export interface TotalsInput { lines: TotalsLine[]; taxRate: number; discountCents: number; }
export interface Totals { subtotalCents: number; taxCents: number; discountCents: number; totalCents: number; }

export function lineAmount(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}

export function computeTotals({ lines, taxRate, discountCents }: TotalsInput): Totals {
  const subtotalCents = lines.reduce((s, l) => s + lineAmount(l.quantity, l.unit_price_cents), 0);
  const taxableBase = lines.reduce((s, l) => l.taxable ? s + lineAmount(l.quantity, l.unit_price_cents) : s, 0);
  const taxCents = Math.round(taxableBase * taxRate);
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);
  return { subtotalCents, taxCents, discountCents, totalCents };
}
