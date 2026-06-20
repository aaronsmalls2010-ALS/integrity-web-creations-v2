import { getAdminClient } from '../supabase/admin';
import { formatUSD } from '../money';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Fixed business contact line (IWC is the only issuer; app_settings has no
// phone/website columns). Update here if the number/site ever changes.
const BIZ_PHONE = '(843) 263-0072';
const BIZ_WEB = 'www.integritywebcreations.com';

function fmtDate(d: unknown): string {
  if (!d) return '';
  const dt = new Date(`${d}T12:00:00`);
  return isNaN(dt.getTime())
    ? esc(d)
    : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** address lines for a snapshot (issuer or bill-to), skipping empties */
function addressLines(a: Record<string, any>): string {
  const cityLine = [a.city, a.state].filter(Boolean).join(', ');
  const cityZip = [cityLine, a.postal_code].filter(Boolean).join(' ').trim();
  return [a.address_line1, a.address_line2, cityZip, a.country && a.country !== 'USA' ? a.country : '']
    .filter((s) => s && String(s).trim())
    .map((s) => esc(s))
    .join('<br/>');
}

/**
 * Professional, branded invoice — drives the downloadable/sent PDF. Letter
 * format, print-color-exact (the navy header band prints). Mirrors the public
 * invoice page so the PDF and the online view look like the same document.
 */
export function invoiceHtml(inv: any): string {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const biz = issuer.business_name ?? 'Integrity Web Creations';
  const bizEmail = issuer.from_email ?? issuer.reply_to ?? 'asmalls@integritywebcreations.com';

  const rows =
    (inv.lines ?? [])
      .slice()
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(
        (l: any) => `<tr>
          <td class="desc">${esc(l.description)}</td>
          <td class="num">${esc(l.quantity)}</td>
          <td class="num">${formatUSD(l.unit_price_cents)}</td>
          <td class="num amt">${formatUSD(l.amount_cents)}</td>
        </tr>`,
      )
      .join('') ||
    '<tr><td class="desc" colspan="4" style="color:#94a3b8;padding:18px 0">No line items.</td></tr>';

  const amountPaid = inv.amount_paid_cents ?? 0;
  const balance = inv.balance_cents ?? inv.total_cents ?? 0;
  const isPaid = inv.status === 'paid' || balance <= 0;

  const paymentText =
    (issuer.payment_instructions && String(issuer.payment_instructions).trim()) ||
    `Pay securely online using the link in your invoice email. Questions about this invoice? Email ${bizEmail} or call ${BIZ_PHONE}. Please make checks payable to ${biz}.`;

  const issuerAddr = addressLines(issuer);
  const billAddr = addressLines(bill);

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;font-size:13px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{background:#000d1a;color:#fff;padding:32px 48px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
    .wordmark{font-size:21px;font-weight:800;letter-spacing:-.4px;line-height:1}
    .wordmark .a{color:#00bcd4}.wordmark .b{color:#fff}
    .tagline{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:5px}
    .issuer{text-align:right;font-size:11.5px;color:rgba(255,255,255,.7);line-height:1.6}
    .issuer .name{font-size:14px;font-weight:700;color:#fff;margin-bottom:3px}
    .body{padding:36px 48px 28px}
    .meta{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #e2e8f0;padding-bottom:22px;margin-bottom:24px}
    .label{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}
    .inv-no{font-size:25px;font-weight:800;color:#000d1a;letter-spacing:-.5px}
    .dates{display:flex;gap:30px;text-align:right}
    .dates .v{font-size:13px;font-weight:600;color:#1e293b}
    .billto{margin-bottom:24px}
    .billto .name{font-size:15px;font-weight:700;color:#0f172a}
    .billto .biz{font-size:13px;color:#475569;margin-top:1px}
    .billto address{font-style:normal;font-size:12.5px;color:#64748b;line-height:1.7;margin-top:4px}
    table.items{width:100%;border-collapse:collapse;font-size:13px}
    table.items thead tr{border-top:1.5px solid #e2e8f0;border-bottom:1.5px solid #e2e8f0;background:#f8fafc}
    table.items th{padding:10px 12px;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:#64748b;font-weight:700;text-align:right}
    table.items th:first-child{text-align:left;padding-left:0}
    table.items th:last-child{padding-right:0}
    table.items td{padding:11px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
    table.items td.desc{text-align:left;padding-left:0;color:#1e293b}
    table.items td.num{text-align:right;color:#475569}
    table.items td.amt{padding-right:0;color:#0f172a;font-weight:600}
    .totals{width:100%;max-width:280px;margin-left:auto;margin-top:14px;font-size:13px}
    .totals tr td{padding:5px 0;color:#475569}
    .totals tr td:last-child{text-align:right;color:#1e293b;font-weight:500}
    .totals tr.total td{font-size:16px;font-weight:800;color:#000d1a;border-top:1.5px solid #e2e8f0;padding-top:11px}
    .totals tr.balance td{font-size:15px;font-weight:800;color:#0052cc;padding-top:6px}
    .totals tr.paidtag td{color:#15803d;font-weight:700}
    .pay{margin-top:30px;border-top:1px solid #e2e8f0;padding-top:18px}
    .pay .text{font-size:12.5px;color:#475569;line-height:1.7;max-width:520px}
    .thanks{margin-top:26px;text-align:center;color:#64748b;font-size:12px}
    .thanks .big{font-size:15px;font-weight:700;color:#000d1a;margin-bottom:3px}
    .foot{margin-top:22px;border-top:1px solid #e2e8f0;padding-top:12px;text-align:center;font-size:10.5px;color:#94a3b8;line-height:1.6}
    .paid-stamp{display:inline-block;border:2px solid #15803d;color:#15803d;font-weight:800;letter-spacing:2px;text-transform:uppercase;font-size:12px;padding:5px 14px;border-radius:6px;transform:rotate(-4deg)}
  </style></head><body>
    <div class="header">
      <div>
        <div class="wordmark"><span class="a">integrity</span><span class="b"> WEB CREATIONS</span></div>
        <div class="tagline">Professional Web Services</div>
      </div>
      <div class="issuer">
        <div class="name">${esc(biz)}</div>
        ${issuerAddr ? `${issuerAddr}<br/>` : ''}${esc(bizEmail)}<br/>${esc(BIZ_PHONE)}<br/>${esc(BIZ_WEB)}
      </div>
    </div>

    <div class="body">
      <div class="meta">
        <div>
          <div class="label">Invoice</div>
          <div class="inv-no">${esc(inv.invoice_number ?? 'DRAFT')}</div>
          ${isPaid ? '<div style="margin-top:8px"><span class="paid-stamp">Paid</span></div>' : ''}
        </div>
        <div class="dates">
          <div><div class="label">Date Issued</div><div class="v">${fmtDate(inv.issue_date)}</div></div>
          ${inv.due_date ? `<div><div class="label">Due Date</div><div class="v">${fmtDate(inv.due_date)}</div></div>` : ''}
        </div>
      </div>

      <div class="billto">
        <div class="label">Bill To</div>
        <div class="name">${esc(bill.name ?? '')}</div>
        ${bill.business_name ? `<div class="biz">${esc(bill.business_name)}</div>` : ''}
        <address>${billAddr ? `${billAddr}<br/>` : ''}${bill.email ? esc(bill.email) : ''}</address>
      </div>

      <table class="items">
        <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <table class="totals"><tbody>
        <tr><td>Subtotal</td><td>${formatUSD(inv.subtotal_cents)}</td></tr>
        ${inv.discount_cents > 0 ? `<tr><td>Discount</td><td>−${formatUSD(inv.discount_cents)}</td></tr>` : ''}
        ${inv.tax_cents > 0 ? `<tr><td>Tax</td><td>${formatUSD(inv.tax_cents)}</td></tr>` : ''}
        <tr class="total"><td>Total</td><td>${formatUSD(inv.total_cents)}</td></tr>
        ${amountPaid > 0 ? `<tr class="paidtag"><td>Amount Paid</td><td>−${formatUSD(amountPaid)}</td></tr>` : ''}
        ${!isPaid ? `<tr class="balance"><td>Balance Due</td><td>${formatUSD(balance)}</td></tr>` : ''}
      </tbody></table>

      <div class="pay">
        <div class="label">Payment</div>
        <div class="text">${esc(paymentText)}</div>
      </div>

      <div class="thanks">
        <div class="big">Thank you for your business.</div>
        <div>We appreciate the opportunity to work with you.</div>
      </div>

      <div class="foot">
        ${esc(biz)} · ${issuerAddr ? addressLines(issuer).replace(/<br\/>/g, ' · ') : ''} · ${esc(bizEmail)} · ${esc(BIZ_PHONE)}
      </div>
    </div>
  </body></html>`;
}

export async function renderInvoicePdf(invoiceId: string): Promise<string> {
  const sb = getAdminClient();
  const { data: inv, error } = await sb.from('invoices')
    .select('*, lines:invoice_line_items(*)').eq('id', invoiceId).single();
  if (error || !inv) throw new Error('Invoice not found');

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(invoiceHtml(inv), { waitUntil: 'networkidle0' });
  // pdf() returns Uint8Array (an ArrayBufferView), accepted directly by Supabase FileBody
  const pdf = await page.pdf({ format: 'letter', printBackground: true });
  await browser.close();

  const path = `${invoiceId}.pdf`;
  await sb.storage.from('invoice-pdfs').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  await sb.from('invoices').update({ pdf_storage_path: path }).eq('id', invoiceId);
  const { data: signed } = await sb.storage.from('invoice-pdfs').createSignedUrl(path, 60 * 10);
  return signed!.signedUrl;
}
