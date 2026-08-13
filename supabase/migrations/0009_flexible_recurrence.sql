-- 0009_flexible_recurrence.sql
--
-- Replaces the fixed monthly/quarterly/annual interval with a flexible rule so a
-- schedule can bill on the Nth weekday of a month (e.g. the 2nd AND 4th Friday)
-- or on specific calendar days (e.g. the 1st and 15th, or the last day).
--
-- Also splits two dates that used to be conflated:
--   next_occurrence_date — the BILLING date the invoice is for (the 2nd Friday)
--   next_run_date        — the date the cron actually generates/sends it
--                          (= next_occurrence_date - lead_days)
--
-- Idempotency moves from a coarse period key ('2026-08', which by construction
-- allowed only one invoice per month) to the exact occurrence date, backed by a
-- unique index on the invoice itself.

-- ---------------------------------------------------------------- schedules

alter table crm.recurring_schedules
  add column if not exists rule                 jsonb,
  add column if not exists lead_days            integer not null default 0,
  add column if not exists due_mode             text    not null default 'net_days',
  add column if not exists due_days             integer,
  add column if not exists start_date           date,
  add column if not exists next_occurrence_date date;

do $$ begin
  alter table crm.recurring_schedules
    add constraint recurring_schedules_due_mode_check check (due_mode in ('net_days', 'on_occurrence'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table crm.recurring_schedules
    add constraint recurring_schedules_lead_days_check check (lead_days >= 0 and lead_days <= 90);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table crm.recurring_schedules
    add constraint recurring_schedules_due_days_check check (due_days is null or (due_days >= 0 and due_days <= 365));
exception when duplicate_object then null; end $$;

-- Backfill: every pre-0009 row becomes an equivalent day_of_month rule pinned to
-- the day it was already running on, so nothing changes billing date. A row that
-- ran on the last day of a short month is promoted to day 31 ("month end"), which
-- the engine clamps per-month — otherwise a Feb 28 anchor would drift permanently.
update crm.recurring_schedules s
set rule = jsonb_build_object(
      'type', 'day_of_month',
      'days', jsonb_build_array(
        case
          when extract(day from s.next_run_date)::int >= 28
           and extract(day from s.next_run_date)::int
               = extract(day from (date_trunc('month', s.next_run_date) + interval '1 month' - interval '1 day'))::int
          then 31
          else extract(day from s.next_run_date)::int
        end),
      'months_interval', (case s.interval when 'monthly' then 1 when 'quarterly' then 3 else 12 end)
                         * greatest(1, coalesce(s.interval_count, 1))
    )
    || case
         when (case s.interval when 'monthly' then 1 when 'quarterly' then 3 else 12 end)
              * greatest(1, coalesce(s.interval_count, 1)) > 1
         then jsonb_build_object('anchor_month', to_char(s.next_run_date, 'YYYY-MM'))
         else '{}'::jsonb
       end,
    start_date           = coalesce(s.start_date, s.next_run_date),
    next_occurrence_date = coalesce(s.next_occurrence_date, s.next_run_date)
where s.rule is null;

alter table crm.recurring_schedules alter column rule                 set not null;
alter table crm.recurring_schedules alter column start_date           set not null;
alter table crm.recurring_schedules alter column next_occurrence_date set not null;

-- `interval` / `interval_count` are superseded by `rule`. Kept (nullable, no
-- CHECK) so historical rows stay readable, but nothing writes them any more.
alter table crm.recurring_schedules drop constraint if exists recurring_schedules_interval_check;
alter table crm.recurring_schedules alter column interval drop not null;

comment on column crm.recurring_schedules.interval is
  'DEPRECATED (0009): superseded by rule jsonb. Retained for historical rows only.';
comment on column crm.recurring_schedules.interval_count is
  'DEPRECATED (0009): superseded by rule->>months_interval.';
comment on column crm.recurring_schedules.rule is
  'Recurrence rule. {type:day_of_month, days:[1,15|-1], months_interval, anchor_month} '
  'or {type:nth_weekday, weekday:0-6, ordinals:[1-5|-1], months_interval, anchor_month}.';
comment on column crm.recurring_schedules.lead_days is
  'Generate and send this many days BEFORE next_occurrence_date. 0 = on the day.';
comment on column crm.recurring_schedules.due_mode is
  'on_occurrence = due on the billing date itself; net_days = due_days after the issue date.';
comment on column crm.recurring_schedules.due_days is
  'Net-N override when due_mode = net_days. Null falls back to app_settings.default_due_days.';
comment on column crm.recurring_schedules.next_occurrence_date is
  'The billing date the next invoice is FOR. next_run_date is when it is generated.';
comment on column crm.recurring_schedules.last_generated_period is
  'Since 0009 this holds the last generated occurrence date (YYYY-MM-DD), not a month key.';

create index if not exists recurring_schedules_due_idx
  on crm.recurring_schedules (next_run_date) where active;

-- ----------------------------------------------------------------- invoices

-- Which billing occurrence produced this invoice. The partial unique index is
-- the hard guard against double-billing: a retried or overlapping cron run
-- cannot create a second invoice for the same schedule + occurrence, even if the
-- in-code check is bypassed. Voided invoices intentionally keep their slot.
alter table crm.invoices add column if not exists occurrence_date date;

create unique index if not exists invoices_recurring_occurrence_uidx
  on crm.invoices (recurring_schedule_id, occurrence_date)
  where recurring_schedule_id is not null and occurrence_date is not null;

comment on column crm.invoices.occurrence_date is
  'Billing date of the recurring occurrence that generated this invoice (unique per schedule).';
