import type { APIRoute } from 'astro';
import { getMonthlyIncome, getOutstandingInvoices } from '../../../../lib/db/reports';
import { toCSV } from '../../../../lib/reports/csv';
import { agingBucket } from '../../../../lib/reports/aging';
import { centsToDollars } from '../../../../lib/money';
import { badRequest } from '../../../../lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const type = url.searchParams.get('type');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  let csv: string;
  let filename: string;
  if (type === 'income') {
    const year = Number(today.slice(0, 4));
    const months = await getMonthlyIncome(cookies, year);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    csv = toCSV(['Month', 'Collected (USD)'], months.map((c, i) => [MONTHS[i], centsToDollars(c)]));
    filename = `income-${year}.csv`;
  } else if (type === 'outstanding') {
    const inv = await getOutstandingInvoices(cookies);
    csv = toCSV(
      ['Invoice', 'Client', 'Issue Date', 'Due Date', 'Age', 'Total (USD)', 'Balance (USD)'],
      inv.map((i: any) => [i.invoice_number, i.client?.name ?? '', i.issue_date ?? '', i.due_date ?? '', i.due_date ? agingBucket(i.due_date, today) : '', centsToDollars(i.total_cents), centsToDollars(i.balance_cents)]),
    );
    filename = 'outstanding.csv';
  } else {
    return badRequest('type must be income or outstanding');
  }
  return new Response(csv, {
    status: 200,
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` },
  });
};
