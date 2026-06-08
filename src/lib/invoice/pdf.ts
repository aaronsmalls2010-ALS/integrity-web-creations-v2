import { getAdminClient } from '../supabase/admin';
import { formatUSD } from '../money';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function invoiceHtml(inv: any): string {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const rows = (inv.lines ?? []).map((l: any) =>
    `<tr><td>${esc(l.description)}</td><td>${esc(l.quantity)}</td><td>${formatUSD(l.unit_price_cents)}</td><td style="text-align:right">${formatUSD(l.amount_cents)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;color:#0f172a;padding:40px}
    h1{font-size:20px} table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:13px}
    .tot{text-align:right;margin-top:16px}</style></head><body>
    <h1>${esc(issuer.business_name ?? 'Integrity Web Creations')}</h1>
    <p>Invoice ${esc(inv.invoice_number ?? '')} · ${esc(inv.issue_date ?? '')}</p>
    <p><strong>Bill to:</strong> ${esc(bill.name ?? '')} ${bill.business_name ? '· ' + esc(bill.business_name) : ''}</p>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">Subtotal: ${formatUSD(inv.subtotal_cents)}<br/>Discount: −${formatUSD(inv.discount_cents)}<br/>Tax: ${formatUSD(inv.tax_cents)}<br/><strong>Total: ${formatUSD(inv.total_cents)}</strong></div>
    <p style="margin-top:24px;font-size:12px;color:#475569">${esc(issuer.payment_instructions ?? '')}</p>
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
