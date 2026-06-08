import { formatUSD } from '../money';

function shell(inner: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.6">${inner}</div>`;
}

export function invoiceEmail(inv: any, baseUrl: string) {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const biz = issuer.business_name ?? 'Integrity Web Creations';
  const link = `${baseUrl}/i/${inv.public_token}`;
  const subject = `Invoice ${inv.invoice_number} from ${biz}`;
  const htmlBody = shell(`
    <h2 style="margin:0 0 8px">${biz}</h2>
    <p>Hi ${bill.name ?? 'there'},</p>
    <p>Your invoice <strong>${inv.invoice_number}</strong> for <strong>${formatUSD(inv.total_cents)}</strong> is ready${inv.due_date ? `, due <strong>${inv.due_date}</strong>` : ''}.</p>
    <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:700">View &amp; Pay Invoice</a></p>
    <p style="font-size:13px;color:#475569">Prefer a PDF? <a href="${link}/pdf">Download it here</a>.</p>
    ${issuer.payment_instructions ? `<p style="font-size:13px;color:#475569">${issuer.payment_instructions}</p>` : ''}
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">${biz}</p>`);
  const textBody = `Invoice ${inv.invoice_number} for ${formatUSD(inv.total_cents)}${inv.due_date ? `, due ${inv.due_date}` : ''}.\nView & pay: ${link}\nPDF: ${link}/pdf`;
  return { subject, htmlBody, textBody };
}

export function receiptEmail(inv: any, amountCents: number, baseUrl: string) {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const biz = issuer.business_name ?? 'Integrity Web Creations';
  const link = `${baseUrl}/i/${inv.public_token}`;
  const subject = `Payment received — Invoice ${inv.invoice_number}`;
  const htmlBody = shell(`
    <h2 style="margin:0 0 8px">${biz}</h2>
    <p>Hi ${bill.name ?? 'there'},</p>
    <p>We received your payment of <strong>${formatUSD(amountCents)}</strong> for invoice <strong>${inv.invoice_number}</strong>. Thank you!</p>
    <p>Remaining balance: <strong>${formatUSD(inv.balance_cents)}</strong>.</p>
    <p style="font-size:13px;color:#475569"><a href="${link}">View invoice</a></p>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">${biz}</p>`);
  const textBody = `Payment of ${formatUSD(amountCents)} received for invoice ${inv.invoice_number}. Remaining balance: ${formatUSD(inv.balance_cents)}. ${link}`;
  return { subject, htmlBody, textBody };
}

export function ownerAlertEmail(kind: 'viewed' | 'paid', inv: any) {
  const bill = inv.bill_to_snapshot ?? {};
  const who = bill.name ?? bill.business_name ?? 'A client';
  const subject = kind === 'paid'
    ? `💸 Paid: Invoice ${inv.invoice_number} (${formatUSD(inv.total_cents)})`
    : `👀 Viewed: Invoice ${inv.invoice_number}`;
  const verb = kind === 'paid' ? `paid invoice ${inv.invoice_number} (${formatUSD(inv.total_cents)})` : `viewed invoice ${inv.invoice_number}`;
  const htmlBody = shell(`<p>${who} just ${verb}.</p>`);
  const textBody = `${who} just ${verb}.`;
  return { subject, htmlBody, textBody };
}
