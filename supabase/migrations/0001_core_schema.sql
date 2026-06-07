-- IWC CRM core schema — isolated in the `crm` schema (project: umami-analytics / oumrxmzstbcukvtylmcc)
-- All money is integer cents. Applied via Supabase MCP migration `crm_core_schema`.
create schema if not exists crm;
create extension if not exists pgcrypto;

create or replace function crm.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create table crm.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  email text,
  phone text,
  address_line1 text, address_line2 text,
  city text, state text, postal_code text, country text default 'USA',
  notes text,
  stripe_customer_id text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated before update on crm.clients
  for each row execute function crm.set_updated_at();

create table crm.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_unit_price_cents integer not null default 0 check (default_unit_price_cents >= 0),
  default_quantity numeric not null default 1,
  taxable boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_services_updated before update on crm.services
  for each row execute function crm.set_updated_at();

create table crm.app_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Integrity Web Creations',
  address_line1 text, address_line2 text,
  city text, state text, postal_code text, country text default 'USA',
  logo_storage_path text,
  reply_to text,
  from_email text,
  invoice_number_prefix text not null default 'IWC-',
  next_invoice_number integer not null default 1001,
  default_due_days integer not null default 14,
  default_tax_rate numeric not null default 0,
  default_terms text,
  payment_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on crm.app_settings
  for each row execute function crm.set_updated_at();
insert into crm.app_settings (id) values (true) on conflict do nothing;

create table crm.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  client_id uuid not null references crm.clients(id),
  issuer_snapshot jsonb,
  bill_to_snapshot jsonb,
  status text not null default 'draft'
    check (status in ('draft','sent','viewed','partial','paid','overdue','void')),
  issue_date date,
  due_date date,
  currency text not null default 'USD',
  subtotal_cents integer not null default 0,
  tax_rate numeric not null default 0,
  tax_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  balance_cents integer not null default 0,
  terms text,
  notes text,
  public_token text unique,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  pdf_storage_path text,
  recurring_schedule_id uuid,
  sent_at timestamptz, viewed_at timestamptz, paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on crm.invoices (client_id);
create index on crm.invoices (status);
create trigger trg_invoices_updated before update on crm.invoices
  for each row execute function crm.set_updated_at();

create table crm.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices(id) on delete cascade,
  service_id uuid references crm.services(id),
  description text not null,
  quantity numeric not null default 1,
  unit_price_cents integer not null default 0,
  amount_cents integer not null default 0,
  taxable boolean not null default false,
  sort_order integer not null default 0
);
create index on crm.invoice_line_items (invoice_id);

create table crm.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices(id),
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('stripe','check','zelle','cash','other')),
  reference text,
  stripe_payment_intent_id text,
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index on crm.payments (invoice_id);

create table crm.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm.clients(id),
  name text not null,
  line_items jsonb not null default '[]',
  interval text not null check (interval in ('monthly','quarterly','annual')),
  interval_count integer not null default 1,
  next_run_date date not null,
  auto_send boolean not null default false,
  active boolean not null default true,
  last_generated_period text,
  last_invoice_id uuid references crm.invoices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_recurring_updated before update on crm.recurring_schedules
  for each row execute function crm.set_updated_at();

create table crm.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null check (key in ('invoice_send','reminder','receipt','owner_alert')),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  detail jsonb,
  occurred_at timestamptz not null default now()
);
create index on crm.activity_log (entity_type, entity_id);

create table crm.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);
