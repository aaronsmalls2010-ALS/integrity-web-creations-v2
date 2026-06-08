export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export function agingBucket(dueDate: string, today: string): AgingBucket {
  const due = Date.parse(dueDate + 'T00:00:00Z');
  const now = Date.parse(today + 'T00:00:00Z');
  const days = Math.floor((now - due) / 86_400_000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
