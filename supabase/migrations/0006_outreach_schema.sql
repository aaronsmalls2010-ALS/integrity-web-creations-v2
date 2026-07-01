-- Outreach: cold-email lead-gen CRM (server-only access via service role; deny-all RLS)
-- Applied to production 2026-07-01 via Supabase MCP (migrations: outreach_schema_v1,
-- outreach_expose_service_role, outreach_claim_function). Kept here for the record.

create schema if not exists outreach;

create table outreach.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'open'
    check (status in ('open','approved','sending','completed','paused','canceled')),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table outreach.research_runs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  status text not null default 'running'
    check (status in ('running','completed','failed')),
  candidates_found int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table outreach.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  category text not null default 'other',
  town text,
  contact_name text,
  email text,
  phone text,
  facebook_url text,
  website_url text,
  web_presence text not null default 'unknown'
    check (web_presence in ('none','facebook_only','google_only','bad_website','ok_website','unknown')),
  presence_notes text,
  pitch_angle text,
  status text not null default 'new'
    check (status in ('new','qualified','queued','contacted','followup_1','followup_2','replied','won','lost','opted_out','invalid')),
  source text not null default 'manual',
  research_run_id uuid references outreach.research_runs(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index leads_email_unique on outreach.leads (lower(email)) where email is not null;
create unique index leads_name_town_unique on outreach.leads (lower(business_name), lower(coalesce(town,'')));
create index leads_status_idx on outreach.leads (status);

create table outreach.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references outreach.leads(id) on delete cascade,
  sequence_step int not null default 1 check (sequence_step between 1 and 3),
  subject text not null,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft','approved','queued','sending','sent','failed','canceled')),
  batch_id uuid references outreach.batches(id) on delete set null,
  scheduled_after timestamptz,
  sent_at timestamptz,
  smtp_message_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index messages_lead_idx on outreach.messages (lead_id);
create index messages_due_idx on outreach.messages (status, scheduled_after);

create table outreach.suppression_list (
  email text primary key,
  reason text not null default 'unsubscribed'
    check (reason in ('unsubscribed','bounced','complaint','manual')),
  created_at timestamptz not null default now()
);

create table outreach.events (
  id bigint generated always as identity primary key,
  lead_id uuid references outreach.leads(id) on delete set null,
  message_id uuid references outreach.messages(id) on delete set null,
  type text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index events_lead_idx on outreach.events (lead_id, created_at desc);

create table outreach.candidates (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references outreach.research_runs(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','duplicate')),
  created_at timestamptz not null default now()
);
create index candidates_pending_idx on outreach.candidates (status, created_at);

create table outreach.settings (
  id int primary key default 1 check (id = 1),
  daily_cap int not null default 15 check (daily_cap between 1 and 25),
  min_gap_minutes int not null default 3 check (min_gap_minutes >= 1),
  max_gap_minutes int not null default 8 check (max_gap_minutes >= min_gap_minutes),
  send_window_start int not null default 8 check (send_window_start between 0 and 23),
  send_window_end int not null default 18 check (send_window_end between 1 and 24),
  timezone text not null default 'America/New_York',
  kill_switch boolean not null default false,
  from_name text not null default 'Aaron Smalls',
  physical_address text not null default '',
  updated_at timestamptz not null default now()
);
insert into outreach.settings (id) values (1);

-- Deny-all RLS: no policies. Only the service-role key (server-side) can touch these tables.
alter table outreach.leads enable row level security;
alter table outreach.messages enable row level security;
alter table outreach.batches enable row level security;
alter table outreach.suppression_list enable row level security;
alter table outreach.events enable row level security;
alter table outreach.candidates enable row level security;
alter table outreach.research_runs enable row level security;
alter table outreach.settings enable row level security;

revoke all on all tables in schema outreach from anon, authenticated;
revoke usage on schema outreach from anon, authenticated;

-- Service-role access + PostgREST exposure
grant usage on schema outreach to service_role;
grant all on all tables in schema outreach to service_role;
grant all on all sequences in schema outreach to service_role;
alter default privileges in schema outreach grant all on tables to service_role;
alter default privileges in schema outreach grant all on sequences to service_role;

alter role authenticator set pgrst.db_schemas = 'graphql_public, crm, iwc, outreach';
notify pgrst, 'reload config';

-- Atomically claim the next due queued message (skip-locked prevents double
-- sends when two heartbeat tabs tick simultaneously).
create or replace function outreach.claim_due_message()
returns setof outreach.messages
language plpgsql
as $$
begin
  return query
  update outreach.messages m
  set status = 'sending', updated_at = now()
  where m.id = (
    select m2.id from outreach.messages m2
    join outreach.batches b on b.id = m2.batch_id
    where m2.status = 'queued'
      and m2.scheduled_after <= now()
      and b.status = 'sending'
    order by m2.scheduled_after
    limit 1
    for update of m2 skip locked
  )
  returning m.*;
end;
$$;

revoke all on function outreach.claim_due_message() from public, anon, authenticated;
grant execute on function outreach.claim_due_message() to service_role;
