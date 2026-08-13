/**
 * Flexible recurrence rules for invoice schedules.
 *
 * Two rule shapes cover everything we bill on today:
 *
 *   day_of_month  — the Nth calendar day(s) of the month.  1st · 15th · last day.
 *   nth_weekday   — the Nth weekday(s) of the month.       2nd & 4th Friday.
 *
 * Both support MULTIPLE occurrences per month (that is the whole point — a
 * schedule that bills on the 2nd *and* 4th Friday is one schedule, not two),
 * and both support an every-N-months stride anchored to a known month.
 *
 * Everything here is pure and UTC-only: dates are 'YYYY-MM-DD' strings in and
 * out, never Date objects, so the same code runs in the cron worker, in the
 * admin UI preview, and in tests with identical results.
 */

export type DayOfMonthRule = {
  type: 'day_of_month';
  /** 1–31, or -1 for "last day of the month". Days past the month's end clamp to the last day. */
  days: number[];
  /** 1 = every month, 3 = quarterly, 12 = annually. */
  months_interval: number;
  /** 'YYYY-MM' — which month the stride counts from. Required when months_interval > 1. */
  anchor_month?: string;
};

export type NthWeekdayRule = {
  type: 'nth_weekday';
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** 1–5, or -1 for "last". A 5th that doesn't exist in a given month is simply skipped. */
  ordinals: number[];
  months_interval: number;
  anchor_month?: string;
};

export type RecurrenceRule = DayOfMonthRule | NthWeekdayRule;

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** How far forward nextOccurrence will search before giving up. */
const MAX_SCAN_MONTHS = 120;

// ---------------------------------------------------------------- date utils

const pad = (n: number) => String(n).padStart(2, '0');

export function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Split 'YYYY-MM-DD' into [year, month(1-12), day]. */
export function parseISO(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${date}`);
  return [y, m, d];
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Day of week (0=Sun) for a given Y/M/D. */
export function weekdayOf(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Add N days (may be negative) to a 'YYYY-MM-DD' date. */
export function addDays(date: string, n: number): string {
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Whole days between two dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Absolute month number, so month arithmetic never wraps badly across years. */
function monthIndex(y: number, m: number): number {
  return y * 12 + (m - 1);
}

// ------------------------------------------------------------- rule → dates

/** Does the every-N-months stride include this month? */
function isActiveMonth(rule: RecurrenceRule, y: number, m: number): boolean {
  const stride = Math.max(1, Math.floor(rule.months_interval || 1));
  if (stride === 1) return true;
  // Without an anchor the stride is meaningless, so fall back to every month
  // rather than silently billing on arbitrary months. Validation requires an
  // anchor whenever stride > 1, so this is a defensive path only.
  if (!rule.anchor_month) return true;
  const [ay, am] = rule.anchor_month.split('-').map(Number);
  if (!ay || !am) return true;
  const delta = monthIndex(y, m) - monthIndex(ay, am);
  return delta >= 0 && delta % stride === 0;
}

/** Every date this rule produces in the given month, ascending. */
export function occurrencesInMonth(rule: RecurrenceRule, y: number, m: number): string[] {
  if (!isActiveMonth(rule, y, m)) return [];
  const dim = daysInMonth(y, m);
  const days = new Set<number>();

  if (rule.type === 'day_of_month') {
    for (const raw of rule.days ?? []) {
      const d = Math.trunc(raw);
      if (d === -1) days.add(dim);
      // A schedule set to the 31st still bills in February — clamped to the
      // last day, which is what "bill me at month end" always means.
      else if (d >= 1) days.add(Math.min(d, dim));
    }
  } else {
    const wd = ((Math.trunc(rule.weekday) % 7) + 7) % 7;
    const firstMatch = 1 + ((wd - weekdayOf(y, m, 1) + 7) % 7);
    for (const raw of rule.ordinals ?? []) {
      const ord = Math.trunc(raw);
      if (ord === -1) {
        let last = firstMatch;
        while (last + 7 <= dim) last += 7;
        days.add(last);
      } else if (ord >= 1) {
        const d = firstMatch + (ord - 1) * 7;
        // A 5th Friday simply doesn't exist in most months — skip, don't clamp.
        if (d <= dim) days.add(d);
      }
    }
  }

  return [...days].sort((a, b) => a - b).map((d) => iso(y, m, d));
}

/** The first occurrence strictly after `date`, or null if the rule never fires again. */
export function nextOccurrence(rule: RecurrenceRule, date: string): string | null {
  return scan(rule, date, false);
}

/** The first occurrence on or after `date`, or null. */
export function firstOccurrenceOnOrAfter(rule: RecurrenceRule, date: string): string | null {
  return scan(rule, date, true);
}

function scan(rule: RecurrenceRule, date: string, inclusive: boolean): string | null {
  let [y, m] = parseISO(date);
  for (let i = 0; i < MAX_SCAN_MONTHS; i++) {
    for (const occ of occurrencesInMonth(rule, y, m)) {
      if (inclusive ? occ >= date : occ > date) return occ;
    }
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return null;
}

/** The next `count` occurrences on or after `from` — used by the admin preview. */
export function occurrenceSeries(rule: RecurrenceRule, from: string, count: number): string[] {
  const out: string[] = [];
  let cursor = firstOccurrenceOnOrAfter(rule, from);
  while (cursor && out.length < count) {
    out.push(cursor);
    cursor = nextOccurrence(rule, cursor);
  }
  return out;
}

// -------------------------------------------------------- run & due date math

/** The date the cron should fire for a given billing date. */
export function runDateFor(occurrence: string, leadDays: number): string {
  return addDays(occurrence, -Math.max(0, Math.trunc(leadDays || 0)));
}

/**
 * The due date for an invoice.
 *  'on_occurrence' — due on the billing date itself (what CLS wants: issued 5
 *                    days early, due on the 2nd/4th Friday).
 *  'net_days'      — the classic Net-N from the issue date.
 */
export function dueDateFor(
  opts: { occurrence: string; issueDate: string; dueMode: 'on_occurrence' | 'net_days'; dueDays: number },
): string {
  if (opts.dueMode === 'on_occurrence') return opts.occurrence;
  return addDays(opts.issueDate, Math.max(0, Math.trunc(opts.dueDays || 0)));
}

/**
 * Where a schedule sits right now: the next billing date it owes, and the day
 * the cron should act on it.
 *
 * `lastGenerated` is the last occurrence already invoiced — passing it means an
 * edit to the schedule can never re-bill a date the client has already been
 * charged for, which is the failure mode that matters most here.
 */
export function computeSchedulePosition(opts: {
  rule: RecurrenceRule;
  startDate: string;
  leadDays: number;
  lastGenerated?: string | null;
}): { next_occurrence_date: string; next_run_date: string } | null {
  const { rule, startDate, leadDays, lastGenerated } = opts;
  // Only trust lastGenerated if it looks like an occurrence date. Pre-0009 rows
  // stored a month key ('2026-08'), which must not be read as a date.
  const resumeFrom = lastGenerated && /^\d{4}-\d{2}-\d{2}$/.test(lastGenerated) ? lastGenerated : null;
  const occurrence = resumeFrom && resumeFrom >= startDate
    ? nextOccurrence(rule, resumeFrom)
    : firstOccurrenceOnOrAfter(rule, startDate);
  if (!occurrence) return null;
  return { next_occurrence_date: occurrence, next_run_date: runDateFor(occurrence, leadDays) };
}

// ------------------------------------------------------------------ describe

const ORDINAL_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', [-1]: 'last' };

function ordinalDay(d: number): string {
  if (d === -1) return 'last day';
  const teen = d % 100;
  if (teen >= 11 && teen <= 13) return `${d}th`;
  return `${d}${['th', 'st', 'nd', 'rd'][d % 10] ?? 'th'}`;
}

/** Join a list the way a person would: "2nd, 3rd and 4th". */
function humanJoin(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function everyMonths(n: number): string {
  const stride = Math.max(1, Math.floor(n || 1));
  if (stride === 1) return 'every month';
  if (stride === 3) return 'every quarter';
  if (stride === 12) return 'every year';
  return `every ${stride} months`;
}

/** Plain-English summary of a rule, for admin lists and confirmation copy. */
export function describeRule(rule: RecurrenceRule | null | undefined): string {
  if (!rule) return '—';
  if (rule.type === 'day_of_month') {
    const days = [...(rule.days ?? [])].sort((a, b) => (a === -1 ? 99 : a) - (b === -1 ? 99 : b));
    if (days.length === 0) return '—';
    return `${humanJoin(days.map(ordinalDay))} of ${everyMonths(rule.months_interval)}`;
  }
  const ords = [...(rule.ordinals ?? [])].sort((a, b) => (a === -1 ? 99 : a) - (b === -1 ? 99 : b));
  if (ords.length === 0) return '—';
  const name = WEEKDAY_NAMES[((Math.trunc(rule.weekday) % 7) + 7) % 7];
  return `${humanJoin(ords.map((o) => ORDINAL_LABEL[o] ?? `${o}th`))} ${name} of ${everyMonths(rule.months_interval)}`;
}

// -------------------------------------------------------------- legacy bridge

/**
 * Map a pre-rule schedule (interval + interval_count + next_run_date) onto the
 * equivalent rule, so old rows keep billing on exactly the same day after the
 * migration. Used by migration 0009's backfill and kept here so the mapping is
 * covered by tests.
 */
export function ruleFromLegacy(
  interval: 'monthly' | 'quarterly' | 'annual',
  intervalCount: number,
  anchorDate: string,
): DayOfMonthRule {
  const [y, m, d] = parseISO(anchorDate);
  const base = interval === 'monthly' ? 1 : interval === 'quarterly' ? 3 : 12;
  const stride = base * Math.max(1, Math.trunc(intervalCount || 1));
  return {
    type: 'day_of_month',
    // Anchored on the 31st when the anchor lands on a month's last day, so
    // "bills at month end" survives short months instead of drifting to the 30th.
    days: [d === daysInMonth(y, m) && d >= 28 ? 31 : d],
    months_interval: stride,
    ...(stride > 1 ? { anchor_month: `${y}-${pad(m)}` } : {}),
  };
}
