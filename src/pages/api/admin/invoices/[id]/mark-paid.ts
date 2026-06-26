import type { APIRoute } from 'astro';
import { getInvoice, recordPayment } from '../../../../../lib/db/invoices';
import { json, unprocessable, serverError } from '../../../../../lib/http';

export const prerender = false;

/**
 * One-click "Mark as paid" for invoices settled outside the system (check, cash,
 * Zelle, etc.). Records a payment for the full remaining balance so the totals
 * still reconcile and there's an audit trail — recordPayment then recomputes the
 * status to 'paid'. Optional body { method, reference } customizes the record.
 */
export const POST: APIRoute = async ({ params, cookies, request }) => {
  try {
    let method = 'other';
    let reference: string | undefined = 'Marked as paid';
    try {
      const b = await request.json();
      if (b?.method) method = String(b.method);
      if (b?.reference !== undefined) reference = b.reference ? String(b.reference) : undefined;
    } catch { /* no body — use defaults */ }

    const inv: any = await getInvoice(cookies, params.id!);
    if (inv.status === 'draft') return unprocessable('Issue the invoice before marking it paid.');
    if (inv.status === 'void') return unprocessable('Cannot mark a void invoice as paid.');
    if ((inv.balance_cents ?? 0) <= 0) return unprocessable('This invoice is already fully paid.');

    const updated = await recordPayment(cookies, params.id!, {
      amount_cents: inv.balance_cents,
      method,
      reference,
    });
    return json({ invoice: updated });
  } catch (e) {
    console.error('[mark-paid]', e);
    return serverError();
  }
};
