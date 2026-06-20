import { formatUSD } from '../money';

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const BIZ_PHONE = '(843) 263-0072';
const BIZ_WEB = 'www.integritywebcreations.com';
const LOGO_URL = 'https://integrity-web-creations-v2-aaron-smalls-projects.vercel.app/invoice-logo.png';

/** Branded email shell: logo header band + card body + contact footer. */
function shell(inner: string, footerContact = ''): string {
  return `<div style="background:#f1f5f9;padding:24px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.08)">
      <div style="background:#000715;padding:18px 32px">
        <img src="${LOGO_URL}" alt="Integrity Web Creations" width="210" style="display:block;width:210px;max-width:62%;height:auto" />
      </div>
      <div style="padding:28px 32px">${inner}</div>
      ${footerContact ? `<div style="border-top:1px solid #e2e8f0;padding:16px 32px;font-size:11px;color:#94a3b8;text-align:center">${footerContact}</div>` : ''}
    </div>
  </div>`;
}

export function invoiceEmail(inv: any, baseUrl: string) {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const biz = issuer.business_name ?? 'Integrity Web Creations';
  const bizEmail = issuer.from_email ?? issuer.reply_to ?? 'asmalls@integritywebcreations.com';
  const link = `${baseUrl}/i/${inv.public_token}`;
  const subject = `Invoice ${inv.invoice_number} from ${biz}`;
  const contact = `${esc(biz)} · ${esc(bizEmail)} · ${esc(BIZ_PHONE)} · ${esc(BIZ_WEB)}`;
  const htmlBody = shell(`
    <p style="margin:0 0 14px">Hi ${esc(bill.name ?? 'there')},</p>
    <p style="margin:0 0 14px">Your invoice <strong>${esc(inv.invoice_number)}</strong> for <strong>${formatUSD(inv.total_cents)}</strong> is ready${inv.due_date ? `, due <strong>${esc(inv.due_date)}</strong>` : ''}.</p>
    <p style="margin:0 0 18px"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0052cc,#00bfff);color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:700">View &amp; Pay Invoice</a></p>
    <p style="font-size:13px;color:#475569;margin:0">Prefer a PDF? <a href="${link}/pdf" style="color:#0052cc">Download it here</a>.</p>`,
    contact);
  const textBody = `Invoice ${inv.invoice_number} for ${formatUSD(inv.total_cents)}${inv.due_date ? `, due ${inv.due_date}` : ''}.\nView & pay: ${link}\nPDF: ${link}/pdf\n\n${biz} · ${bizEmail} · ${BIZ_PHONE} · ${BIZ_WEB}`;
  return { subject, htmlBody, textBody };
}

export function receiptEmail(inv: any, amountCents: number, baseUrl: string) {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const biz = issuer.business_name ?? 'Integrity Web Creations';
  const link = `${baseUrl}/i/${inv.public_token}`;
  const subject = `Payment received — Invoice ${inv.invoice_number}`;
  const htmlBody = shell(`
    <h2 style="margin:0 0 8px">${esc(biz)}</h2>
    <p>Hi ${esc(bill.name ?? 'there')},</p>
    <p>We received your payment of <strong>${formatUSD(amountCents)}</strong> for invoice <strong>${esc(inv.invoice_number)}</strong>. Thank you!</p>
    <p>Remaining balance: <strong>${formatUSD(inv.balance_cents)}</strong>.</p>
    <p style="font-size:13px;color:#475569"><a href="${link}">View invoice</a></p>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">${esc(biz)}</p>`);
  const textBody = `Payment of ${formatUSD(amountCents)} received for invoice ${inv.invoice_number}. Remaining balance: ${formatUSD(inv.balance_cents)}. ${link}`;
  return { subject, htmlBody, textBody };
}

export function ownerAlertEmail(kind: 'viewed' | 'paid', inv: any) {
  const bill = inv.bill_to_snapshot ?? {};
  const who = bill.name ?? bill.business_name ?? 'A client';
  const subject = kind === 'paid'
    ? `Paid: Invoice ${inv.invoice_number} (${formatUSD(inv.total_cents)})`
    : `Viewed: Invoice ${inv.invoice_number}`;
  const verb = kind === 'paid' ? `paid invoice ${inv.invoice_number} (${formatUSD(inv.total_cents)})` : `viewed invoice ${inv.invoice_number}`;
  const htmlBody = shell(`<p>${esc(who)} just ${kind === 'paid' ? `paid invoice ${esc(inv.invoice_number)} (${formatUSD(inv.total_cents)})` : `viewed invoice ${esc(inv.invoice_number)}`}.</p>`);
  const textBody = `${who} just ${verb}.`;
  return { subject, htmlBody, textBody };
}
