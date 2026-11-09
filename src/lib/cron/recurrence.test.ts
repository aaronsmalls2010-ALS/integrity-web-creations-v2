import { describe, it, expect } from 'vitest';
import {
  occurrencesInMonth,
  nextOccurrence,
  firstOccurrenceOnOrAfter,
  occurrenceSeries,
  computeSchedulePosition,
  runDateFor,
  dueDateFor,
  describeRule,
  ruleFromLegacy,
  daysInMonth,
  weekdayOf,
  addDays,
  type RecurrenceRule,
} from './recurrence';

/**
 * Independent oracle: brute-force every day of a month and pick out the ones
 * matching the rule by hand. If the fast path in recurrence.ts and this dumb
 * loop ever disagree, the fast path is wrong.
 */
function bruteForceNthWeekday(y: number, m: number, weekday: number, ordinals: number[]): string[] {
  const hits: string[] = [];
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    if (weekdayOf(y, m, d) === weekday) hits.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  const out: string[] = [];
  for (const o of ordinals) out.push(o === -1 ? hits[hits.length - 1] : hits[o - 1]);
  return out.filter(Boolean).sort();
}

const CLS: RecurrenceRule = { type: 'nth_weekday', weekday: 5, ordinals: [2, 4], months_interval: 1 };

describe('nth_weekday — the Craftsman & Labor Solutions rule (2nd & 4th Friday)', () => {
  it('matches a hand-checked calendar for the rest of 2026', () => {
    // Verified against the actual 2026 calendar.
    expect(occurrencesInMonth(CLS, 2026, 8)).toEqual(['2026-08-14', '2026-08-28']);
    expect(occurrencesInMonth(CLS, 2026, 9)).toEqual(['2026-09-11', '2026-09-25']);
    expect(occurrencesInMonth(CLS, 2026, 10)).toEqual(['2026-10-09', '2026-10-23']);
    expect(occurrencesInMonth(CLS, 2026, 11)).toEqual(['2026-11-13', '2026-11-27']);
    expect(occurrencesInMonth(CLS, 2026, 12)).toEqual(['2026-12-11', '2026-12-25']);
  });

  it('agrees with the brute-force oracle for every month of 2026 and 2027', () => {
    for (const y of [2026, 2027]) {
      for (let m = 1; m <= 12; m++) {
        expect(occurrencesInMonth(CLS, y, m)).toEqual(bruteForceNthWeekday(y, m, 5, [2, 4]));
      }
    }
  });

  it('always produces exactly two billing dates a month, 14 days apart', () => {
    for (let m = 1; m <= 12; m++) {
      const occ = occurrencesInMonth(CLS, 2027, m);
      expect(occ).toHaveLength(2);
      expect(new Date(`${occ[1]}T00:00:00Z`).getTime() - new Date(`${occ[0]}T00:00:00Z`).getTime())
        .toBe(14 * 86_400_000);
      for (const d of occ) expect(new Date(`${d}T00:00:00Z`).getUTCDay()).toBe(5);
    }
  });

  it('walks forward across a year boundary without repeating or skipping', () => {
    const series = occurrenceSeries(CLS, '2026-08-13', 12);
    expect(series).toEqual([
      '2026-08-14', '2026-08-28',
      '2026-09-11', '2026-09-25',
      '2026-10-09', '2026-10-23',
      '2026-11-13', '2026-11-27',
      '2026-12-11', '2026-12-25',
      '2027-01-08', '2027-01-22',
    ]);
    expect(new Set(series).size).toBe(series.length);
  });

  it('sends 5 days early and falls due on the billing date', () => {
    // The full CLS contract: generated + emailed 2026-08-09 (Sunday), due Friday 2026-08-14.
    const occurrence = '2026-08-14';
    const run = runDateFor(occurrence, 5);
    expect(run).toBe('2026-08-09');
    expect(new Date(`${run}T00:00:00Z`).getUTCDay()).toBe(0); // Sunday, as agreed
    expect(dueDateFor({ occurrence, issueDate: run, dueMode: 'on_occurrence', dueDays: 14 })).toBe(occurrence);
  });

  it('keeps a 5-day lead across a month boundary', () => {
    // 2026-09-11 minus 5 lands back in August.
    expect(runDateFor('2026-09-11', 5)).toBe('2026-09-06');
    expect(runDateFor('2027-01-08', 5)).toBe('2027-01-03');
    expect(runDateFor('2026-03-06', 10)).toBe('2026-02-24'); // crosses into February
  });
});

describe('nth_weekday — edge cases', () => {
  it('skips a 5th weekday in months that do not have one', () => {
    const rule: RecurrenceRule = { type: 'nth_weekday', weekday: 5, ordinals: [5], months_interval: 1 };
    // Jan 2027 has five Fridays (1, 8, 15, 22, 29); Feb 2027 has four.
    expect(occurrencesInMonth(rule, 2027, 1)).toEqual(['2027-01-29']);
    expect(occurrencesInMonth(rule, 2027, 2)).toEqual([]);
  });

  it('handles "last <weekday>" including short and leap Februaries', () => {
    const rule: RecurrenceRule = { type: 'nth_weekday', weekday: 1, ordinals: [-1], months_interval: 1 };
    expect(occurrencesInMonth(rule, 2027, 2)).toEqual(['2027-02-22']);
    expect(occurrencesInMonth(rule, 2028, 2)).toEqual(['2028-02-28']); // leap year
    for (const y of [2026, 2027, 2028]) {
      for (let m = 1; m <= 12; m++) {
        const [d] = occurrencesInMonth(rule, y, m);
        // "last" must be a Monday with no later Monday in the month.
        expect(new Date(`${d}T00:00:00Z`).getUTCDay()).toBe(1);
        expect(Number(d.slice(8)) + 7).toBeGreaterThan(daysInMonth(y, m));
      }
    }
  });

  it('deduplicates when "4th" and "last" are the same day', () => {
    const rule: RecurrenceRule = { type: 'nth_weekday', weekday: 5, ordinals: [4, -1], months_interval: 1 };
    expect(occurrencesInMonth(rule, 2026, 2)).toEqual(['2026-02-27']); // one date, not two
  });

  it('honours an every-N-months stride from its anchor', () => {
    const rule: RecurrenceRule = {
      type: 'nth_weekday', weekday: 2, ordinals: [1], months_interval: 3, anchor_month: '2026-08',
    };
    expect(occurrencesInMonth(rule, 2026, 8)).toEqual(['2026-08-04']);
    expect(occurrencesInMonth(rule, 2026, 9)).toEqual([]);
    expect(occurrencesInMonth(rule, 2026, 10)).toEqual([]);
    expect(occurrencesInMonth(rule, 2026, 11)).toEqual(['2026-11-03']);
    expect(occurrencesInMonth(rule, 2027, 2)).toEqual(['2027-02-02']);
    expect(occurrencesInMonth(rule, 2026, 5)).toEqual([]); // before the anchor
  });
});

describe('day_of_month', () => {
  it('bills on several calendar days a month', () => {
    const rule: RecurrenceRule = { type: 'day_of_month', days: [1, 15], months_interval: 1 };
    expect(occurrencesInMonth(rule, 2026, 9)).toEqual(['2026-09-01', '2026-09-15']);
    expect(occurrenceSeries(rule, '2026-09-02', 3)).toEqual(['2026-09-15', '2026-10-01', '2026-10-15']);
  });

  it('clamps a 31st to the real end of short months instead of skipping them', () => {
    const rule: RecurrenceRule = { type: 'day_of_month', days: [31], months_interval: 1 };
    expect(occurrencesInMonth(rule, 2027, 2)).toEqual(['2027-02-28']);
    expect(occurrencesInMonth(rule, 2028, 2)).toEqual(['2028-02-29']); // leap
    expect(occurrencesInMonth(rule, 2027, 4)).toEqual(['2027-04-30']);
    expect(occurrencesInMonth(rule, 2027, 5)).toEqual(['2027-05-31']);
  });

  it('supports "last day of the month"', () => {
    const rule: RecurrenceRule = { type: 'day_of_month', days: [-1], months_interval: 1 };
    expect(occurrenceSeries(rule, '2027-01-01', 4))
      .toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  });

  it('never emits a duplicate when the 31st and "last" collide', () => {
    const rule: RecurrenceRule = { type: 'day_of_month', days: [31, -1], months_interval: 1 };
    expect(occurrencesInMonth(rule, 2027, 6)).toEqual(['2027-06-30']);
  });

  it('runs a quarterly stride from its anchor', () => {
    const rule: RecurrenceRule = { type: 'day_of_month', days: [1], months_interval: 3, anchor_month: '2026-01' };
    expect(occurrenceSeries(rule, '2026-01-01', 4))
      .toEqual(['2026-01-01', '2026-04-01', '2026-07-01', '2026-10-01']);
  });
});

describe('scanning semantics', () => {
  it('nextOccurrence is strictly after the given date; firstOccurrenceOnOrAfter includes it', () => {
    expect(nextOccurrence(CLS, '2026-08-14')).toBe('2026-08-28');
    expect(firstOccurrenceOnOrAfter(CLS, '2026-08-14')).toBe('2026-08-14');
  });

  it('returns null rather than looping forever on a rule that can never fire', () => {
    const dead: RecurrenceRule = { type: 'nth_weekday', weekday: 5, ordinals: [], months_interval: 1 };
    expect(nextOccurrence(dead, '2026-08-13')).toBeNull();
    expect(occurrenceSeries(dead, '2026-08-13', 5)).toEqual([]);
  });
});

describe('due date modes', () => {
  it('net_days counts from the issue date, not the billing date', () => {
    expect(dueDateFor({ occurrence: '2026-08-14', issueDate: '2026-08-09', dueMode: 'net_days', dueDays: 14 }))
      .toBe('2026-08-23');
  });

  it('treats a zero/negative lead as "generate on the day"', () => {
    expect(runDateFor('2026-08-14', 0)).toBe('2026-08-14');
    expect(runDateFor('2026-08-14', -3)).toBe('2026-08-14');
  });
});

describe('fixed_day due mode (send on the 1st, due the 15th)', () => {
  const due = (occurrence: string, issueDate: string, dueDay: number) =>
    dueDateFor({ occurrence, issueDate, dueMode: 'fixed_day', dueDays: 0, dueDay });

  it('issued on the 1st, due the 15th of the same month', () => {
    expect(due('2026-12-01', '2026-12-01', 15)).toBe('2026-12-15');
  });

  it('is not thrown off by a cron that runs a few days late', () => {
    expect(due('2026-12-01', '2026-12-04', 15)).toBe('2026-12-15');
  });

  it('rolls to next month when the day has already passed', () => {
    expect(due('2026-12-20', '2026-12-20', 15)).toBe('2027-01-15');
  });

  it('is strictly after the issue date (issued on the due day -> next month)', () => {
    expect(due('2026-12-15', '2026-12-15', 15)).toBe('2027-01-15');
  });

  it('measures from the billing date when invoices go out early', () => {
    // Issued Nov 25 for a Dec 1 billing date: due Dec 15, not Nov 30-ish.
    expect(due('2026-12-01', '2026-11-25', 15)).toBe('2026-12-15');
  });

  it('clamps to short months', () => {
    expect(due('2027-02-01', '2027-02-01', 31)).toBe('2027-02-28');
    expect(due('2028-02-01', '2028-02-01', 31)).toBe('2028-02-29');
  });

  it('falls back to net days if no due day is given', () => {
    expect(dueDateFor({ occurrence: '2026-12-01', issueDate: '2026-12-01', dueMode: 'fixed_day', dueDays: 14 }))
      .toBe('2026-12-15');
  });
});

describe('describeRule', () => {
  it('reads like English', () => {
    expect(describeRule(CLS)).toBe('2nd and 4th Friday of every month');
    expect(describeRule({ type: 'day_of_month', days: [1, 15], months_interval: 1 }))
      .toBe('1st and 15th of every month');
    expect(describeRule({ type: 'day_of_month', days: [-1], months_interval: 1 }))
      .toBe('last day of every month');
    expect(describeRule({ type: 'day_of_month', days: [1], months_interval: 3, anchor_month: '2026-01' }))
      .toBe('1st of every quarter');
    expect(describeRule({ type: 'nth_weekday', weekday: 1, ordinals: [-1], months_interval: 12, anchor_month: '2026-01' }))
      .toBe('last Monday of every year');
    expect(describeRule({ type: 'nth_weekday', weekday: 3, ordinals: [1, 2, 3], months_interval: 2, anchor_month: '2026-01' }))
      .toBe('1st, 2nd and 3rd Wednesday of every 2 months');
    expect(describeRule(null)).toBe('—');
  });
});

describe('legacy migration bridge', () => {
  it('keeps the three live schedules billing on exactly the same day', () => {
    // Nora — monthly on the 20th.
    const nora = ruleFromLegacy('monthly', 1, '2026-08-20');
    expect(nora).toEqual({ type: 'day_of_month', days: [20], months_interval: 1 });
    expect(occurrenceSeries(nora, '2026-08-20', 3)).toEqual(['2026-08-20', '2026-09-20', '2026-10-20']);

    // GCCC — monthly on the 30th. Must not drift, and must survive February.
    const gccc = ruleFromLegacy('monthly', 1, '2026-08-30');
    expect(occurrenceSeries(gccc, '2026-08-30', 3)).toEqual(['2026-08-30', '2026-09-30', '2026-10-30']);
    expect(occurrencesInMonth(gccc, 2027, 2)).toEqual(['2027-02-28']);
  });

  it('maps quarterly and annual onto the right stride', () => {
    expect(ruleFromLegacy('quarterly', 1, '2026-03-15'))
      .toEqual({ type: 'day_of_month', days: [15], months_interval: 3, anchor_month: '2026-03' });
    expect(ruleFromLegacy('annual', 1, '2026-03-15'))
      .toEqual({ type: 'day_of_month', days: [15], months_interval: 12, anchor_month: '2026-03' });
    expect(ruleFromLegacy('monthly', 2, '2026-03-15').months_interval).toBe(2);
  });

  it('promotes a month-end anchor to the 31st so it stays at month end', () => {
    // Feb 28 is the last day of Feb 2026 — the intent is "month end", not "the 28th".
    const rule = ruleFromLegacy('monthly', 1, '2026-02-28');
    expect(rule.days).toEqual([31]);
    expect(occurrenceSeries(rule, '2026-03-01', 2)).toEqual(['2026-03-31', '2026-04-30']);
  });
});

describe('computeSchedulePosition — where a schedule sits', () => {
  const pos = (lastGenerated?: string | null) =>
    computeSchedulePosition({ rule: CLS, startDate: '2026-08-01', leadDays: 5, lastGenerated });

  it('starts at the first occurrence on or after the start date', () => {
    expect(pos()).toEqual({ next_occurrence_date: '2026-08-14', next_run_date: '2026-08-09' });
  });

  it('never re-bills an occurrence that already went out', () => {
    expect(pos('2026-08-14')).toEqual({ next_occurrence_date: '2026-08-28', next_run_date: '2026-08-23' });
    expect(pos('2026-08-28')).toEqual({ next_occurrence_date: '2026-09-11', next_run_date: '2026-09-06' });
  });

  it('ignores a pre-0009 month key instead of misreading it as a date', () => {
    // Old rows stored '2026-08'. Treating that as a date would corrupt the position.
    expect(pos('2026-08')).toEqual({ next_occurrence_date: '2026-08-14', next_run_date: '2026-08-09' });
  });

  it('respects a start date pushed past an already-generated occurrence', () => {
    const p = computeSchedulePosition({ rule: CLS, startDate: '2026-11-01', leadDays: 5, lastGenerated: '2026-08-28' });
    expect(p).toEqual({ next_occurrence_date: '2026-11-13', next_run_date: '2026-11-08' });
  });

  it('returns null for a rule that can never fire, so callers can refuse to save it', () => {
    expect(computeSchedulePosition({
      rule: { type: 'day_of_month', days: [], months_interval: 1 },
      startDate: '2026-08-01', leadDays: 0,
    })).toBeNull();
  });
});

describe('the guard has teeth', () => {
  it('fails if the engine ever returns a non-Friday for the CLS rule', () => {
    const wrong: RecurrenceRule = { type: 'nth_weekday', weekday: 4, ordinals: [2, 4], months_interval: 1 };
    expect(occurrencesInMonth(wrong, 2026, 8)).not.toEqual(['2026-08-14', '2026-08-28']);
  });

  it('fails if lead days are ever applied in the wrong direction', () => {
    expect(runDateFor('2026-08-14', 5)).not.toBe(addDays('2026-08-14', 5));
  });
});
