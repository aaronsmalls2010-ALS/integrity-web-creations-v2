-- Refunds: Stripe (or manually-recorded) refunds against an invoice. Kept in
-- their own table because crm.payments enforces amount_cents > 0. Invoice
-- amount_paid/balance/status are recomputed as sum(payments) - sum(refunds).
create table if not exists crm.refunds (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices(id) on delete cascade,
  stripe_refund_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null check (amount_cents > 0),
  reason text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_refunds_invoice on crm.refunds(invoice_id);

-- service-role-only access (mirrors the lead/applicant tables); server routes
-- use the service-role key, anon stays locked out.
alter table crm.refunds enable row level security;
