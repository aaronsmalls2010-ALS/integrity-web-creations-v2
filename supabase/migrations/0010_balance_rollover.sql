-- 0010_balance_rollover.sql
--
-- Balance-forward billing. When a client has a past-due invoice and a new one is
-- issued, the unpaid balance is carried onto the new invoice as its own line
-- items — the original charge as "Previous balance", and any late fee as a
-- separate "Late fee" line — and the old invoice is closed as 'rolled'.
--
-- Design notes
--   * The old invoice is never edited or deleted: its lines, total and payments
--     stay exactly as issued. Only its status and the rolled_* pointers change,
--     so the audit trail is intact and the move is reversible (see unroll).
--   * Rolling is a single transaction in a SQL function: it locks the new and the
--     old invoices, so two overlapping cron runs or a double-click cannot carry
--     the same balance onto two invoices.
--   * Payments applied to a part-paid invoice reduce the principal first; the
--     late fee carries in full (capped at what is still owed).
--   * Late fees are never charged on late fees: carried fees keep kind
--     'late_fee', and the overdue sweep excludes them from its fee base.
--
-- Apply this BEFORE deploying the matching code.

-- ------------------------------------------------------------------ lines

alter table crm.invoice_line_items
  add column if not exists kind text not null default 'charge',
  add column if not exists source_invoice_id uuid references crm.invoices(id);

do $$ begin
  alter table crm.invoice_line_items
    add constraint invoice_line_items_kind_check check (kind in ('charge', 'carry_forward', 'late_fee'));
exception when duplicate_object then null; end $$;

-- Existing late-fee lines were written as ordinary charges. Tag them so they are
-- recognised as fees (and shown/rolled separately) from now on.
update crm.invoice_line_items
   set kind = 'late_fee'
 where kind = 'charge' and description like 'Late Fee (%';

create index if not exists invoice_line_items_source_idx
  on crm.invoice_line_items (source_invoice_id) where source_invoice_id is not null;

-- ---------------------------------------------------------------- invoices

alter table crm.invoices
  add column if not exists rolled_into_invoice_id uuid references crm.invoices(id),
  add column if not exists rolled_at              timestamptz,
  add column if not exists carried_forward_cents  integer not null default 0;

-- 'rolled' = closed because its unpaid balance moved onto a later invoice.
alter table crm.invoices drop constraint if exists invoices_status_check;
alter table crm.invoices add constraint invoices_status_check
  check (status in ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'rolled'));

create index if not exists invoices_rolled_into_idx
  on crm.invoices (rolled_into_invoice_id) where rolled_into_invoice_id is not null;

-- Speeds the "what does this client still owe" lookup used at issue time.
create index if not exists invoices_client_open_idx
  on crm.invoices (client_id, due_date) where status in ('sent', 'viewed', 'partial', 'overdue');

-- ---------------------------------------------------------------- settings

alter table crm.app_settings
  add column if not exists rollover_enabled boolean not null default true;

comment on column crm.app_settings.rollover_enabled is
  'When true, past-due balances are carried onto the next invoice issued to the same client.';

-- --------------------------------------------------------------- schedules

-- New due mode: a fixed day of the month ("due on the 15th"), so the due date no
-- longer depends on the day the invoice happened to go out.
alter table crm.recurring_schedules add column if not exists due_day integer;

alter table crm.recurring_schedules drop constraint if exists recurring_schedules_due_mode_check;
alter table crm.recurring_schedules add constraint recurring_schedules_due_mode_check
  check (due_mode in ('net_days', 'on_occurrence', 'fixed_day'));

do $$ begin
  alter table crm.recurring_schedules
    add constraint recurring_schedules_due_day_check check (due_day is null or (due_day >= 1 and due_day <= 31));
exception when duplicate_object then null; end $$;

comment on column crm.recurring_schedules.due_day is
  'Day of month the invoice is due when due_mode = fixed_day. Clamped to short months; rolls to next month if already past.';

-- ---------------------------------------------------------- roll forward fn

create or replace function crm.roll_forward_balances(p_invoice_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_enabled   boolean;
  v_new       crm.invoices%rowtype;
  v_old       record;
  v_fee       integer;
  v_principal integer;
  v_sort      integer;
  v_carried   integer := 0;
  v_count     integer := 0;
  v_ids       jsonb := '[]'::jsonb;
begin
  select rollover_enabled into v_enabled from crm.app_settings where id = true;
  if not coalesce(v_enabled, true) then
    return jsonb_build_object('rolled', 0, 'carried_cents', 0, 'reason', 'disabled');
  end if;

  select * into v_new from crm.invoices where id = p_invoice_id for update;
  if not found then
    return jsonb_build_object('rolled', 0, 'carried_cents', 0, 'reason', 'not_found');
  end if;
  -- Only an invoice that is still unpaid and has not already absorbed a balance.
  if v_new.status not in ('draft', 'sent', 'viewed')
     or v_new.amount_paid_cents > 0
     or v_new.carried_forward_cents > 0 then
    return jsonb_build_object('rolled', 0, 'carried_cents', 0, 'reason', 'not_eligible');
  end if;

  select coalesce(max(sort_order), -1) into v_sort from crm.invoice_line_items where invoice_id = p_invoice_id;

  for v_old in
    select * from crm.invoices
     where client_id = v_new.client_id
       and id <> v_new.id
       and status in ('sent', 'viewed', 'partial', 'overdue')
       and balance_cents > 0
       and due_date is not null
       and due_date < coalesce(v_new.issue_date, current_date)
       -- Only roll forward into a LATER invoice, never backwards in time.
       and coalesce(issue_date, created_at::date) <= coalesce(v_new.issue_date, current_date)
     order by due_date, created_at
       for update
  loop
    select coalesce(sum(amount_cents), 0)::integer into v_fee
      from crm.invoice_line_items where invoice_id = v_old.id and kind = 'late_fee';
    v_fee       := least(v_fee, v_old.balance_cents);
    v_principal := v_old.balance_cents - v_fee;

    if v_principal > 0 then
      v_sort := v_sort + 1;
      insert into crm.invoice_line_items
        (invoice_id, description, quantity, unit_price_cents, amount_cents, taxable, sort_order, kind, source_invoice_id)
      values
        (p_invoice_id,
         'Previous balance — Invoice ' || coalesce(v_old.invoice_number, '(unnumbered)')
           || ' (due ' || to_char(v_old.due_date, 'Mon FMDD, YYYY') || ')',
         1, v_principal, v_principal, false, v_sort, 'carry_forward', v_old.id);
    end if;

    if v_fee > 0 then
      v_sort := v_sort + 1;
      insert into crm.invoice_line_items
        (invoice_id, description, quantity, unit_price_cents, amount_cents, taxable, sort_order, kind, source_invoice_id)
      values
        (p_invoice_id,
         'Late fee — Invoice ' || coalesce(v_old.invoice_number, '(unnumbered)'),
         1, v_fee, v_fee, false, v_sort, 'late_fee', v_old.id);
    end if;

    update crm.invoices
       set status = 'rolled', rolled_into_invoice_id = p_invoice_id, rolled_at = now()
     where id = v_old.id;

    insert into crm.activity_log (entity_type, entity_id, action, detail)
    values ('invoice', v_old.id, 'rolled_forward',
            jsonb_build_object('into_invoice_id', p_invoice_id, 'principal_cents', v_principal, 'late_fee_cents', v_fee));

    v_carried := v_carried + v_old.balance_cents;
    v_count   := v_count + 1;
    v_ids     := v_ids || to_jsonb(v_old.id);
  end loop;

  if v_count > 0 then
    update crm.invoices
       set subtotal_cents = subtotal_cents + v_carried,
           total_cents    = total_cents    + v_carried,
           balance_cents  = balance_cents  + v_carried,
           carried_forward_cents = v_carried
     where id = p_invoice_id;

    insert into crm.activity_log (entity_type, entity_id, action, detail)
    values ('invoice', p_invoice_id, 'balance_carried_forward',
            jsonb_build_object('invoices', v_ids, 'carried_cents', v_carried));
  end if;

  return jsonb_build_object('rolled', v_count, 'carried_cents', v_carried, 'invoice_ids', v_ids);
end;
$$;

revoke all on function crm.roll_forward_balances(uuid) from public, anon;
grant execute on function crm.roll_forward_balances(uuid) to authenticated, service_role;

-- ------------------------------------------------------------- unroll fn

-- Called when an invoice that absorbed balances is voided: the earlier invoices
-- go back to open, otherwise the debt would silently vanish with the void.
create or replace function crm.unroll_invoice(p_invoice_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  with restored as (
    update crm.invoices
       set status = case when amount_paid_cents > 0 then 'partial' else 'overdue' end,
           rolled_into_invoice_id = null,
           rolled_at = null
     where rolled_into_invoice_id = p_invoice_id and status = 'rolled'
    returning id
  )
  select count(*) into v_count from restored;

  if v_count > 0 then
    insert into crm.activity_log (entity_type, entity_id, action, detail)
    values ('invoice', p_invoice_id, 'balance_unrolled', jsonb_build_object('restored_invoices', v_count));
  end if;
  return v_count;
end;
$$;

revoke all on function crm.unroll_invoice(uuid) from public, anon;
grant execute on function crm.unroll_invoice(uuid) to authenticated, service_role;
