export type Interval = 'monthly' | 'quarterly' | 'annual';

export function nextRunDate(current: string, interval: Interval, count: number): string {
  const [y, m, d] = current.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (interval === 'monthly') date.setUTCMonth(date.getUTCMonth() + count);
  else if (interval === 'quarterly') date.setUTCMonth(date.getUTCMonth() + 3 * count);
  else date.setUTCFullYear(date.getUTCFullYear() + count);
  return date.toISOString().slice(0, 10);
}

export function periodKey(date: string, interval: Interval): string {
  const [y, m] = date.split('-').map(Number);
  if (interval === 'annual') return String(y);
  if (interval === 'quarterly') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  return `${y}-${String(m).padStart(2, '0')}`;
}
