/** Tailwind classes for an invoice status pill. */
export function statusBadge(status: string): string {
  const map: Record<string, string> = {
    draft:   'bg-white/10 text-[#9fb3c8]',
    sent:    'bg-[#0066ff]/15 text-[#00bfff]',
    viewed:  'bg-[#00e5ff]/15 text-[#00e5ff]',
    partial: 'bg-amber-400/15 text-amber-300',
    paid:    'bg-emerald-400/15 text-emerald-300',
    overdue: 'bg-[#ff6b6b]/20 text-[#ff6b6b]',
    void:    'bg-white/5 text-[#5b7088]',
  };
  return map[status] ?? 'bg-white/10 text-[#9fb3c8]';
}
