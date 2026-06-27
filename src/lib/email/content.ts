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
  const clientName = bill.business_name || bill.name || 'your business';
  const link = `${baseUrl}/i/${inv.public_token}`;
  const subject = `Invoice ${inv.invoice_number} from ${biz}`;
  const contact = `${esc(biz)} · ${esc(bizEmail)} · ${esc(BIZ_PHONE)} · ${esc(BIZ_WEB)}`;

  const amountPaid = inv.amount_paid_cents ?? 0;
  const balance = inv.balance_cents ?? inv.total_cents ?? 0;
  const isPaid = inv.status === 'paid' || balance <= 0;

  const rows = (inv.lines ?? [])
    .slice()
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((l: any) => `<tr>
      <td style="padding:9px 0;border-bottom:1px solid #eef2f7;color:#1e293b;font-size:13px">${esc(l.description)}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:13px;text-align:center">${esc(l.quantity)}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:13px;text-align:right;white-space:nowrap">${formatUSD(l.unit_price_cents)}</td>
      <td style="padding:9px 0;border-bottom:1px solid #eef2f7;color:#0f172a;font-size:13px;text-align:right;font-weight:600;white-space:nowrap">${formatUSD(l.amount_cents)}</td>
    </tr>`).join('') || `<tr><td colspan="4" style="padding:12px 0;color:#94a3b8;font-size:13px">No line items.</td></tr>`;

  const tRow = (label: string, value: string, o: { strong?: boolean; big?: boolean; color?: string } = {}) => `<tr>
    <td style="padding:3px 0;color:${o.strong ? '#0f172a' : '#64748b'};font-size:${o.big ? '15px' : '13px'};font-weight:${o.strong ? '800' : '400'}">${esc(label)}</td>
    <td style="padding:3px 0 3px 28px;color:${o.color ?? (o.strong ? '#0f172a' : '#1e293b')};font-size:${o.big ? '15px' : '13px'};font-weight:${o.strong ? '800' : '500'};text-align:right;white-space:nowrap">${value}</td>
  </tr>`;

  const inner = `
    <p style="margin:0 0 12px;font-size:14px">Hi ${esc(bill.name ?? 'there')},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#334155">Thank you for the opportunity to support ${esc(clientName)}'s continued growth. Your invoice is below, with a PDF copy attached for your records.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate">
      <tr><td style="padding:18px 20px 0">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:top">
            <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#94a3b8">Invoice</div>
            <div style="font-size:20px;font-weight:800;color:#000d1a">${esc(inv.invoice_number)}</div>
          </td>
          <td style="vertical-align:top;text-align:right;font-size:12px;color:#475569">
            <div><span style="color:#94a3b8">Issued</span> ${esc(inv.issue_date ?? '')}</div>
            ${inv.due_date ? `<div><span style="color:#94a3b8">Due</span> ${esc(inv.due_date)}</div>` : ''}
          </td>
        </tr></table>
        <div style="margin:14px 0 3px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#94a3b8">Bill To</div>
        <div style="font-size:14px;font-weight:700;color:#0f172a">${esc(bill.name ?? '')}</div>
        ${bill.business_name ? `<div style="font-size:13px;color:#475569">${esc(bill.business_name)}</div>` : ''}
      </td></tr>
      <tr><td style="padding:14px 20px 2px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <th align="left" style="padding:0 0 6px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;border-bottom:1.5px solid #e2e8f0">Description</th>
            <th align="center" style="padding:0 8px 6px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;border-bottom:1.5px solid #e2e8f0">Qty</th>
            <th align="right" style="padding:0 8px 6px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;border-bottom:1.5px solid #e2e8f0">Unit</th>
            <th align="right" style="padding:0 0 6px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;border-bottom:1.5px solid #e2e8f0">Amount</th>
          </tr>
          ${rows}
        </table>
      </td></tr>
      <tr><td style="padding:8px 20px 18px">
        <table align="right" cellpadding="0" cellspacing="0" style="min-width:240px">
          ${tRow('Subtotal', formatUSD(inv.subtotal_cents))}
          ${inv.discount_cents > 0 ? tRow('Discount', '−' + formatUSD(inv.discount_cents)) : ''}
          ${inv.tax_cents > 0 ? tRow('Tax', formatUSD(inv.tax_cents)) : ''}
          ${tRow('Total', formatUSD(inv.total_cents), { strong: true })}
          ${amountPaid > 0 ? tRow('Amount Paid', '−' + formatUSD(amountPaid)) : ''}
          ${!isPaid ? tRow('Balance Due', formatUSD(balance), { strong: true, big: true, color: '#0052cc' }) : ''}
        </table>
      </td></tr>
    </table>

    ${isPaid
      ? `<p style="margin:20px 0 0;font-size:14px;color:#15803d;font-weight:700">This invoice is paid in full — thank you!</p>`
      : `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 6px">
           <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0052cc,#00bfff);color:#fff;padding:14px 46px;border-radius:8px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:.3px">Pay Now</a>
         </td></tr></table>
         <p style="margin:6px 0 0;text-align:center;font-size:12px;color:#64748b">Secure online payment — or use the link inside the attached PDF. Questions? Just reply to this email.</p>`}`;

  const htmlBody = shell(inner, contact);
  const textBody = `Invoice ${inv.invoice_number} from ${biz}\n`
    + `Total: ${formatUSD(inv.total_cents)}${isPaid ? ' · PAID IN FULL' : ` · Balance due: ${formatUSD(balance)}`}${inv.due_date ? ` · Due ${inv.due_date}` : ''}\n`
    + `${isPaid ? '' : `Pay now: ${link}\n`}A PDF copy is attached for your records.\n\n`
    + `Thank you for the opportunity to support ${clientName}'s continued growth.\n\n`
    + `${biz} · ${bizEmail} · ${BIZ_PHONE} · ${BIZ_WEB}`;
  return { subject, htmlBody, textBody };
}

export function receiptEmail(inv: any, amountCents: number, baseUrl: string) {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const biz = issuer.business_name ?? 'Integrity Web Creations';
  const link = `${baseUrl}/i/${inv.public_token}`;
  const fullyPaid = (inv.balance_cents ?? 0) <= 0;
  const subject = fullyPaid
    ? `Paid in full — Invoice ${inv.invoice_number}`
    : `Payment received — Invoice ${inv.invoice_number}`;
  // Big red "PAID" stamp at the top of the email when the balance is cleared.
  const paidStamp = fullyPaid
    ? `<div style="text-align:center;margin:0 0 18px">
         <span style="display:inline-block;border:4px solid #c0392b;color:#c0392b;font-weight:900;letter-spacing:7px;text-transform:uppercase;font-size:34px;line-height:1;padding:8px 30px 6px;border-radius:10px;transform:rotate(-7deg)">PAID</span>
       </div>`
    : '';
  const htmlBody = shell(`
    ${paidStamp}
    <h2 style="margin:0 0 8px">${esc(biz)}</h2>
    <p>Hi ${esc(bill.name ?? 'there')},</p>
    <p>We received your payment of <strong>${formatUSD(amountCents)}</strong> for invoice <strong>${esc(inv.invoice_number)}</strong>. Thank you!</p>
    <p>${fullyPaid ? 'This invoice is now <strong>paid in full</strong>.' : `Remaining balance: <strong>${formatUSD(inv.balance_cents)}</strong>.`}</p>
    <p style="font-size:13px;color:#475569"><a href="${link}">View ${fullyPaid ? 'paid invoice' : 'invoice'}</a></p>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">${esc(biz)}</p>`);
  const textBody = `Payment of ${formatUSD(amountCents)} received for invoice ${inv.invoice_number}. ${fullyPaid ? 'PAID IN FULL.' : `Remaining balance: ${formatUSD(inv.balance_cents)}.`} ${link}`;
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
