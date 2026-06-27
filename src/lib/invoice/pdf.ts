import { getAdminClient } from '../supabase/admin';
import { formatUSD } from '../money';
import { buildIssuerSnapshot, buildBillToSnapshot } from './snapshot';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Fixed business contact line (IWC is the only issuer; app_settings has no
// phone/website columns). Update here if the number/site ever changes.
const BIZ_PHONE = '(843) 263-0072';
const BIZ_WEB = 'www.integritywebcreations.com';
// Logo is a static asset on the v2 deployment (public/invoice-logo.png),
// referenced by absolute URL so it loads in the PDF (Puppeteer), the proxied
// public page, and email alike.
const LOGO_URL =
  'https://integrity-web-creations-v2-aaron-smalls-projects.vercel.app/invoice-logo.png';
// Fallback terms shown when an invoice has none set (app_settings.default_terms
// populates inv.terms for new invoices).
const DEFAULT_TERMS =
  'Payment is due within 21 days of the invoice date (Net 21). Late balances may be subject to a 1.5% monthly service charge. All work is provided under the service agreement between the client and Integrity Web Creations. Please retain this invoice for your records.';

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
export function invoiceHtml(inv: any, opts: { preview?: boolean; payUrl?: string } = {}): string {
  const isPreview = !!opts.preview;
  const payUrl = opts.payUrl;
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

  const issuerAddr = addressLines(issuer);
  const billAddr = addressLines(bill);

  const paymentText =
    (issuer.payment_instructions && String(issuer.payment_instructions).trim()) ||
    `Pay securely online with a credit or debit card using the link in your invoice email. ` +
      `To pay by check, make it payable to ${biz}${issuerAddr ? ` and mail to ${addressLines(issuer).replace(/<br\/>/g, ', ')}` : ''}. ` +
      `Questions about this invoice? Email ${bizEmail} or call ${BIZ_PHONE}.`;

  const terms = (inv.terms && String(inv.terms).trim()) || DEFAULT_TERMS;
  const notes = inv.notes && String(inv.notes).trim();

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;font-size:13px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{background:#000715;color:#fff;padding:28px 48px;display:flex;justify-content:space-between;align-items:center;gap:24px}
    .logo{width:230px;height:auto;display:block}
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
    .paid-stamp{display:inline-block;border:4px solid #c0392b;color:#c0392b;font-weight:900;letter-spacing:7px;text-transform:uppercase;font-size:40px;line-height:1;padding:8px 28px 6px;border-radius:10px;transform:rotate(-9deg);opacity:.92;box-shadow:0 0 0 1px #c0392b inset}
    .wm{position:fixed;top:38%;left:0;right:0;text-align:center;transform:rotate(-22deg);font-size:88px;font-weight:800;letter-spacing:10px;color:rgba(15,23,42,.06);z-index:0;pointer-events:none}
    .preview-tag{display:inline-block;margin-top:8px;background:#fff4ed;border:1px solid #f5b78a;color:#b4541b;font-weight:700;letter-spacing:.5px;text-transform:uppercase;font-size:10px;padding:3px 9px;border-radius:5px}
  </style></head><body>
    ${isPreview ? '<div class="wm">PREVIEW</div>' : ''}
    <div class="header">
      <img class="logo" src="${LOGO_URL}" alt="${esc(biz)}" />
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
          ${isPreview ? '<div><span class="preview-tag">Preview · not yet issued</span></div>' : ''}
          ${isPaid ? '<div style="margin-top:14px"><span class="paid-stamp">Paid</span></div>' : ''}
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
        ${payUrl && !isPaid ? `<div style="margin-top:12px">
          <a href="${esc(payUrl)}" style="display:inline-block;background:#0052cc;color:#fff;padding:10px 26px;border-radius:6px;text-decoration:none;font-weight:700;font-size:12.5px;letter-spacing:.3px">Pay This Invoice Online</a>
          <div style="margin-top:6px;font-size:10.5px;color:#64748b">Or pay at: ${esc(payUrl)}</div>
        </div>` : ''}
      </div>

      <div class="pay">
        <div class="label">Terms</div>
        <div class="text">${esc(terms)}</div>
      </div>

      ${notes ? `<div class="pay"><div class="label">Notes</div><div class="text">${esc(notes)}</div></div>` : ''}

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

/**
 * Render the invoice PDF and return the raw bytes (for emailing as an
 * attachment). Pass `baseUrl` to embed a clickable "Pay This Invoice Online"
 * link in the PDF (skipped for paid invoices).
 */
export async function renderInvoicePdfBytes(
  invoiceId: string,
  opts: { preview?: boolean; baseUrl?: string } = {},
): Promise<{ bytes: Uint8Array; isPreview: boolean }> {
  const sb = getAdminClient();
  const { data: inv, error } = await sb.from('invoices')
    .select('*, lines:invoice_line_items(*)').eq('id', invoiceId).single();
  if (error || !inv) throw new Error('Invoice not found');

  // A draft has no snapshots yet (they're frozen at issue time). Synthesize them
  // from the live app_settings + client so a pre-issue preview shows the real
  // issuer and Bill-To blocks instead of blanks. Issued invoices already carry
  // their snapshots, so this is a no-op for them.
  if (!inv.issuer_snapshot) {
    const { data: settings } = await sb.from('app_settings').select('*').eq('id', true).single();
    if (settings) inv.issuer_snapshot = buildIssuerSnapshot(settings as Record<string, any>);
  }
  if (!inv.bill_to_snapshot && inv.client_id) {
    const { data: client } = await sb.from('clients').select('*').eq('id', inv.client_id).single();
    if (client) inv.bill_to_snapshot = buildBillToSnapshot(client as Record<string, any>);
  }

  // Treat any not-yet-issued invoice as a preview (watermark + throwaway file).
  const isPreview = !!opts.preview || inv.status === 'draft';
  const payUrl = opts.baseUrl && inv.public_token ? `${opts.baseUrl}/i/${inv.public_token}` : undefined;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(invoiceHtml(inv, { preview: isPreview, payUrl }), { waitUntil: 'networkidle0' });
  // pdf() returns Uint8Array (an ArrayBufferView), accepted directly by Supabase FileBody
  const bytes = await page.pdf({ format: 'letter', printBackground: true });
  await browser.close();
  return { bytes, isPreview };
}

export async function renderInvoicePdf(
  invoiceId: string,
  opts: { preview?: boolean; baseUrl?: string } = {},
): Promise<string> {
  const sb = getAdminClient();
  const { bytes, isPreview } = await renderInvoicePdfBytes(invoiceId, opts);

  // Previews go to a throwaway path and never touch pdf_storage_path — the issued
  // PDF stays the single source of truth for what the client actually received.
  const path = isPreview ? `${invoiceId}-preview.pdf` : `${invoiceId}.pdf`;
  await sb.storage.from('invoice-pdfs').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (!isPreview) {
    await sb.from('invoices').update({ pdf_storage_path: path }).eq('id', invoiceId);
  }
  const { data: signed } = await sb.storage.from('invoice-pdfs').createSignedUrl(path, 60 * 10);
  return signed!.signedUrl;
}
