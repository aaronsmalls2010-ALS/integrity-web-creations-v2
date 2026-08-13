/**
 * Client-side behaviour for the RecurrenceFields component: swap panels by rule
 * type, assemble the rule object for the API, and keep a live preview of the
 * next few billing dates on screen.
 *
 * The preview calls the exact same pure functions the cron uses, so what the
 * admin sees before saving is what will actually be billed.
 */
import {
  occurrenceSeries, runDateFor, dueDateFor, describeRule, type RecurrenceRule,
} from './cron/recurrence';

const PREVIEW_ROWS = 6;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function checkedValues(selector: string): number[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(selector))
    .filter((el) => el.checked)
    .map((el) => Number(el.value));
}

/** Build the rule from the current form state. Returns null if nothing is picked yet. */
export function readRule(): RecurrenceRule | null {
  const type = $<HTMLSelectElement>('rule_type').value;
  const months_interval = Number($<HTMLSelectElement>('months_interval').value || '1');
  const anchor = $<HTMLInputElement>('start_date').value.slice(0, 7);
  const stride = months_interval > 1 && anchor ? { anchor_month: anchor } : {};

  if (type === 'day_of_month') {
    const days = checkedValues('.dom');
    if (days.length === 0) return null;
    return { type: 'day_of_month', days, months_interval, ...stride };
  }
  const ordinals = checkedValues('.ord');
  if (ordinals.length === 0) return null;
  return {
    type: 'nth_weekday',
    weekday: Number($<HTMLSelectElement>('weekday').value),
    ordinals, months_interval, ...stride,
  };
}

/** Everything the API needs from this fieldset. */
export function readScheduleFields() {
  const dueMode = $<HTMLSelectElement>('due_mode').value === 'on_occurrence' ? 'on_occurrence' : 'net_days';
  return {
    rule: readRule(),
    start_date: $<HTMLInputElement>('start_date').value,
    lead_days: Number($<HTMLInputElement>('lead_days').value || '0'),
    due_mode: dueMode,
    due_days: dueMode === 'net_days' ? Number($<HTMLInputElement>('due_days').value || '0') : null,
  };
}

/** Human-readable reason the current selection can't be saved, or null if it's fine. */
export function validateSelection(): string | null {
  const f = readScheduleFields();
  if (!f.start_date) return 'Pick a start date.';
  if (!f.rule) {
    return $<HTMLSelectElement>('rule_type').value === 'day_of_month'
      ? 'Pick at least one day of the month.'
      : 'Pick at least one week of the month.';
  }
  if (occurrenceSeries(f.rule, f.start_date, 1).length === 0) {
    return 'That pattern never produces a billing date — try different settings.';
  }
  return null;
}

function fmt(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function renderPreview() {
  const rows = $('preview_rows');
  const note = $('preview_note');
  const summary = $('rule_summary');
  const f = readScheduleFields();

  const problem = validateSelection();
  if (problem || !f.rule) {
    summary.textContent = '—';
    rows.innerHTML = '';
    note.textContent = problem ?? '';
    return;
  }

  summary.textContent = describeRule(f.rule);
  const series = occurrenceSeries(f.rule, f.start_date, PREVIEW_ROWS);
  rows.innerHTML = series.map((occurrence) => {
    const send = runDateFor(occurrence, f.lead_days);
    const due = dueDateFor({
      occurrence, issueDate: send,
      dueMode: f.due_mode as 'on_occurrence' | 'net_days',
      dueDays: f.due_days ?? 0,
    });
    return `<tr class="border-t border-white/[0.08]">
      <td class="py-1.5 pr-4 text-[#e6edf5]">${fmt(send)}</td>
      <td class="py-1.5 pr-4 text-[#9fb3c8]">${fmt(occurrence)}</td>
      <td class="py-1.5 text-[#9fb3c8]">${fmt(due)}</td>
    </tr>`;
  }).join('');

  const first = series[0];
  note.textContent = first
    ? `Next invoice goes out ${fmt(runDateFor(first, f.lead_days))}${f.lead_days > 0 ? ` — ${f.lead_days} day${f.lead_days === 1 ? '' : 's'} before the billing date` : ''}.`
    : '';
}

/** Wire the fieldset up. Safe to call on pages that don't have it. */
export function initRecurrenceFields() {
  const root = document.getElementById('recurrence');
  if (!root) return;

  const initial = JSON.parse(root.dataset.initial || '{}');

  function syncPanels() {
    const isDom = $<HTMLSelectElement>('rule_type').value === 'day_of_month';
    $('panel_dom').classList.toggle('hidden', !isDom);
    $('panel_weekday').classList.toggle('hidden', isDom);
    $('due_days_wrap').classList.toggle('hidden', $<HTMLSelectElement>('due_mode').value === 'on_occurrence');
  }

  // A brand-new schedule starts on the 1st of the month / 1st Friday so the
  // preview is never empty before the admin has touched anything.
  if (!initial.ordinals?.length && !initial.days?.length) {
    const seed = document.querySelector<HTMLInputElement>('.ord[value="1"]');
    if (seed) seed.checked = true;
    const seedDay = document.querySelector<HTMLInputElement>('.dom[value="1"]');
    if (seedDay) seedDay.checked = true;
  }

  root.addEventListener('change', () => { syncPanels(); renderPreview(); });
  root.addEventListener('input', renderPreview);
  syncPanels();
  renderPreview();
}
