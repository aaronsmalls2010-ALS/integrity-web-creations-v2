-- Security/performance hardening from the 2026-06-08 advisor audit.
-- Applied via Supabase MCP migration `crm_security_perf_hardening`.

-- Numbering RPC should respect RLS (advisor: SECURITY DEFINER callable by authenticated).
-- INVOKER is safe: the admin passes the is_admin() RLS policy on crm.app_settings;
-- the cron uses the service_role client which bypasses RLS.
alter function crm.allocate_invoice_number() security invoker;

-- Covering indexes for crm foreign keys (performance advisor: unindexed FKs).
create index if not exists idx_invoice_line_items_service_id on crm.invoice_line_items(service_id);
create index if not exists idx_recurring_schedules_client_id on crm.recurring_schedules(client_id);
create index if not exists idx_recurring_schedules_last_invoice_id on crm.recurring_schedules(last_invoice_id);
