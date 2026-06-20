-- Late-fee config for invoices (applied to the umami-analytics project, crm schema).
-- Per-invoice settings default from app_settings at creation and are overridable
-- on the new-invoice form. late_fee_applied_at tracks the one-time application so
-- the daily overdue cron (src/lib/cron/overdue.ts) never double-charges.

alter table crm.invoices
  add column if not exists late_fee_enabled    boolean     not null default true,
  add column if not exists late_fee_percent    numeric     not null default 1.5,
  add column if not exists late_fee_grace_days integer     not null default 5,
  add column if not exists late_fee_applied_at timestamptz;

alter table crm.app_settings
  add column if not exists late_fee_enabled    boolean not null default true,
  add column if not exists late_fee_percent    numeric not null default 1.5,
  add column if not exists late_fee_grace_days integer not null default 5;
