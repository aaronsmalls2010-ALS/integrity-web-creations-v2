-- IWC Proposals seed (idempotent). Run once after 0011_proposals.sql.
-- 1. Permanent RLS canary (never shown in admin; used by `npm run test:rls-proposals`).
-- 2. "Sample Shop" demo client (Aaron's test inbox) for building and QA.
-- 3. Finders Keepers client record (no proposal yet; created from admin once the config exists).

insert into crm.clients (name, business_name, email, notes, status)
select 'Canary Test', 'Canary Test Shop', 'canary@invalid.example',
       'RLS canary for the proposals module. Do not delete. Never invoice.', 'archived'
where not exists (select 1 from crm.clients where business_name = 'Canary Test Shop');

insert into crm.clients (name, business_name, email, notes, status)
select 'Sample Owner', 'Sample Shop', 'asmalls@integritywebcreations.com',
       'Demo client for testing IWC Proposals. Not a real customer.', 'archived'
where not exists (select 1 from crm.clients where business_name = 'Sample Shop');

insert into crm.clients (name, business_name, email, phone, address_line1, city, state, postal_code, notes)
select 'Dick Andrzejczyk', 'Finders Keepers', 'findersqx@gmail.com', '843-525-9200', '920 Bay Street',
       'Beaufort', 'SC', '29902',
       'Owner: Dick Andrzejczyk. Manager: Shelley Hanna (email pending). Do not publish Dick''s cell number.'
where not exists (select 1 from crm.clients where business_name = 'Finders Keepers');

-- Canary proposal: signed state, so every table has a row.
with c as (select id from crm.clients where business_name = 'Canary Test Shop'),
p as (
  insert into crm.proposals (client_id, config_slug, token_hash, token_expires_at, status, contacts,
                             pricing_snapshot, content_snapshot, agreement_template_version,
                             agreement_html, agreement_sha256, frozen_at)
  select c.id, 'canary', encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
         now() + interval '100 years', 'client_signed',
         '{"signer":{"name":"Canary Test","title":"Owner","email":"canary@invalid.example"},"cc":[]}',
         '{"canary":true}', '{"canary":true}', 'IWC-WEB-AGREEMENT-v1.0',
         '<p>CANARY</p>', encode(sha256(convert_to('<p>CANARY</p>', 'UTF8')), 'hex'), now()
  from c
  where not exists (select 1 from crm.proposals where config_slug = 'canary')
  returning id, agreement_sha256
),
s as (
  insert into crm.proposal_selections (proposal_id, website_route, store_package, payment_plan,
    due_at_signing_cents, monthly_cents, monthly_after_cents, total_15mo_cents)
  select id, 'website_support', 'shop_window', 'full', 216000, 12500, 12500, 403500 from p
  returning proposal_id
),
g as (
  insert into crm.proposal_signatures (proposal_id, party, signer_name, signer_title, signer_email,
    consent_electronic, consent_terms, agreement_sha256, ip, user_agent)
  select id, 'client', 'Canary Test', 'Owner', 'canary@invalid.example', true, true, agreement_sha256,
         '192.0.2.1', 'canary' from p
  returning proposal_id
)
insert into crm.proposal_events (proposal_id, event, meta)
select id, 'created', '{"canary":true}' from p;
