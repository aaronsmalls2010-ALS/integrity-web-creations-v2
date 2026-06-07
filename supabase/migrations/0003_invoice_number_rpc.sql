-- Atomic, gap-free invoice number allocation. Locks the single settings row.
-- Applied via Supabase MCP migration `crm_invoice_number_rpc`.
create or replace function crm.allocate_invoice_number() returns text as $$
declare prefix text; n integer;
begin
  update crm.app_settings
     set next_invoice_number = next_invoice_number + 1
   where id = true
   returning invoice_number_prefix, next_invoice_number - 1 into prefix, n;
  return prefix || n::text;
end;
$$ language plpgsql security definer set search_path = '';
revoke all on function crm.allocate_invoice_number() from public, anon;
grant execute on function crm.allocate_invoice_number() to authenticated, service_role;
