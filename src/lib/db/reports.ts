import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';

const OUTSTANDING = ['sent', 'viewed', 'partial', 'overdue'];

export async function getDashboard(cookies: AstroCookies, today: string) {
  const sb = getServerClient(cookies);
  const { data } = await sb.from('invoices')
    .select('id, invoice_number, status, total_cents, balance_cents, due_date, created_at, client:clients(name)')
    .order('created_at', { ascending: false });
  const invoices = (data ?? []) as any[];
  const outstanding = invoices.filter((i) => OUTSTANDING.includes(i.status));
  const outstandingCents = outstanding.reduce((s, i) => s + i.balance_cents, 0);
  const overdue = outstanding.filter((i) => i.due_date && i.due_date < today && i.balance_cents > 0);
  const overdueCents = overdue.reduce((s, i) => s + i.balance_cents, 0);
  const monthStart = today.slice(0, 7) + '-01';
  const { data: pays } = await sb.from('payments').select('amount_cents, paid_at').gte('paid_at', monthStart);
  const paidThisMonthCents = ((pays ?? []) as any[]).reduce((s, p) => s + p.amount_cents, 0);
  return {
    outstandingCents,
    overdueCount: overdue.length,
    overdueCents,
    paidThisMonthCents,
    recent: invoices.slice(0, 8),
  };
}

export async function getMonthlyIncome(cookies: AstroCookies, year: number): Promise<number[]> {
  const sb = getServerClient(cookies);
  const { data } = await sb.from('payments').select('amount_cents, paid_at')
    .gte('paid_at', `${year}-01-01`).lt('paid_at', `${year + 1}-01-01`);
  const months = Array.from({ length: 12 }, () => 0);
  for (const p of (data ?? []) as any[]) {
    const m = new Date(p.paid_at).getUTCMonth();
    months[m] += p.amount_cents;
  }
  return months;
}

export async function getOutstandingInvoices(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data } = await sb.from('invoices')
    .select('invoice_number, status, issue_date, due_date, total_cents, balance_cents, client:clients(name)')
    .in('status', OUTSTANDING).order('due_date');
  return (data ?? []) as any[];
}
