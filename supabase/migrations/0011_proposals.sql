-- IWC Proposals module: proposal links, plan selections, e-signatures, audit events.
-- Spec: FindersKeepers/docs/02-DATA-MODEL.md. Applied via Supabase MCP migration `crm_proposals`.
-- Posture matches the rest of crm: RLS on, admin_all policy for the allowlisted admin,
-- anon has no schema usage, public /p routes go through the service-role client.

alter table crm.clients add column if not exists legal_entity text;

create table crm.proposals (
  id                         uuid primary key default gen_random_uuid(),
  client_id                  uuid not null references crm.clients(id),
  config_slug                text not null check (config_slug ~ '^[a-z0-9-]{2,60}$'),
  token_hash                 text unique not null check (token_hash ~ '^[0-9a-f]{64}$'),
  token_expires_at           timestamptz not null,
  status                     text not null default 'draft'
    check (status in ('draft','sent','viewed','selected','client_signed','fully_signed')),
  contacts                   jsonb not null,
  pricing_snapshot           jsonb not null,
  content_snapshot           jsonb not null,
  agreement_template_version text not null,
  agreement_html             text,
  agreement_sha256           text check (agreement_sha256 is null or agreement_sha256 ~ '^[0-9a-f]{64}$'),
  frozen_at                  timestamptz,
  client_pdf_path            text,
  final_pdf_path             text,
  signing_invoice_id         uuid references crm.invoices(id),
  launched_at                timestamptz,
  sent_at                    timestamptz,
  first_viewed_at            timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint proposals_frozen_together
    check ((agreement_html is null) = (agreement_sha256 is null) and (agreement_html is null) = (frozen_at is null)),
  constraint proposals_signed_is_frozen
    check (status not in ('client_signed','fully_signed') or agreement_sha256 is not null)
);
create trigger trg_proposals_updated before update on crm.proposals
  for each row execute function crm.set_updated_at();
create index proposals_client_id_idx on crm.proposals (client_id);
create index proposals_signing_invoice_id_idx on crm.proposals (signing_invoice_id);

-- One current selection per proposal (history lives in proposal_events).
create table crm.proposal_selections (
  proposal_id          uuid primary key references crm.proposals(id) on delete cascade,
  website_route        text not null check (website_route in ('files_only','website_support')),
  store_package        text not null default 'none'
    check (store_package in ('none','featured_finds','shop_window','main_street','full_showroom')),
  payment_plan         text check (payment_plan in ('full','split','monthly')),
  due_at_signing_cents int  not null check (due_at_signing_cents >= 0),
  due_at_launch_cents  int  not null default 0 check (due_at_launch_cents >= 0),
  monthly_cents        int  not null check (monthly_cents >= 0),
  monthly_after_cents  int  not null check (monthly_after_cents >= 0),
  total_15mo_cents     int  not null check (total_15mo_cents >= 0),
  updated_at           timestamptz not null default now(),
  constraint selections_store_needs_support check (store_package = 'none' or website_route = 'website_support'),
  constraint selections_plan_iff_store     check ((store_package = 'none') = (payment_plan is null))
);
create trigger trg_proposal_selections_updated before update on crm.proposal_selections
  for each row execute function crm.set_updated_at();

create table crm.proposal_signatures (
  id                   uuid primary key default gen_random_uuid(),
  proposal_id          uuid not null references crm.proposals(id),
  party                text not null check (party in ('client','iwc')),
  signer_name          text not null check (char_length(signer_name) between 2 and 120),
  signer_title         text check (char_length(signer_title) <= 80),
  signer_email         text check (char_length(signer_email) <= 254),
  drawn_signature_path text,
  consent_electronic   boolean not null check (consent_electronic),
  consent_terms        boolean not null check (consent_terms),
  agreement_sha256     text not null check (agreement_sha256 ~ '^[0-9a-f]{64}$'),
  ip                   text check (char_length(ip) <= 64),
  user_agent           text check (char_length(user_agent) <= 500),
  signed_at            timestamptz not null default now(),
  unique (proposal_id, party)
);

create table crm.proposal_events (
  id          bigserial primary key,
  proposal_id uuid not null references crm.proposals(id),
  event       text not null check (event in ('created','email_sent','email_failed','viewed','selection_changed',
               'agreement_viewed','print_pdf','signed','countersigned','pdf_emailed','extended','launched',
               'invoice_created')),
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index proposal_events_proposal_idx on crm.proposal_events (proposal_id, created_at);

-- RLS: same as every other crm table.
do $$
declare t text;
begin
  foreach t in array array['proposals','proposal_selections','proposal_signatures','proposal_events'] loop
    execute format('alter table crm.%I enable row level security;', t);
    execute format('drop policy if exists admin_all on crm.%I;', t);
    execute format(
      'create policy admin_all on crm.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));', t);
  end loop;
end $$;
grant all on crm.proposals, crm.proposal_selections, crm.proposal_signatures, crm.proposal_events
  to authenticated, service_role;
grant usage, select on sequence crm.proposal_events_id_seq to authenticated, service_role;

-- The signed agreement can never change once frozen.
create or replace function crm.proposals_guard_frozen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.agreement_sha256 is not null and (
       new.agreement_html   is distinct from old.agreement_html or
       new.agreement_sha256 is distinct from old.agreement_sha256 or
       new.frozen_at        is distinct from old.frozen_at) then
    raise exception 'agreement is frozen';
  end if;
  return new;
end $$;
create trigger trg_proposals_guard_frozen before update on crm.proposals
  for each row execute function crm.proposals_guard_frozen();

-- Signatures are append-only.
create or replace function crm.no_update_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'append-only table';
end $$;
create trigger trg_proposal_signatures_append_only before update or delete on crm.proposal_signatures
  for each row execute function crm.no_update_delete();

-- Recurring schedules can stop after N invoices (store installment plans). null = forever.
alter table crm.recurring_schedules add column if not exists remaining_occurrences int
  check (remaining_occurrences is null or remaining_occurrences >= 0);

-- Private bucket: client-signed and fully signed PDFs, drawn signatures.
insert into storage.buckets (id, name, public) values ('proposals', 'proposals', false)
  on conflict (id) do nothing;
