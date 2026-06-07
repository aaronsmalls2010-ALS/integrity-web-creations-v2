-- RLS lockdown for the crm schema. Admin-only access; anon gets nothing.
-- Applied via Supabase MCP migrations `crm_rls_lockdown` + `crm_function_search_path`.

-- Admin allowlist check. Email is not a secret; the app middleware enforces it again.
create or replace function public.is_admin() returns boolean as $$
  select coalesce(auth.jwt() ->> 'email' = 'asmalls@integritywebcreations.com', false);
$$ language sql stable;
alter function public.is_admin() set search_path = '';

-- Grants: authenticated (RLS-gated) + service_role (bypasses RLS for public/PDF paths).
grant usage on schema crm to authenticated, service_role;
grant all on all tables in schema crm to authenticated, service_role;
grant all on all sequences in schema crm to authenticated, service_role;
alter default privileges in schema crm grant all on tables to authenticated, service_role;
alter default privileges in schema crm grant all on sequences to authenticated, service_role;

-- Enable RLS + admin-only policy on every crm table.
do $$
declare t text;
begin
  foreach t in array array[
    'clients','services','app_settings','invoices','invoice_line_items',
    'payments','recurring_schedules','email_templates','activity_log','webhook_events'
  ] loop
    execute format('alter table crm.%I enable row level security;', t);
    execute format('drop policy if exists admin_all on crm.%I;', t);
    execute format(
      'create policy admin_all on crm.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- Harden the trigger function search_path too.
alter function crm.set_updated_at() set search_path = '';
