# IWC Admin CRM — Phases 0–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the secure foundation (auth + DB + admin shell), client/service/settings records, and the core invoice engine (drafts → send-time numbering → manual payments) for the IWC admin CRM, reaching the first usable milestone: create a client → build an invoice → record a payment.

**Architecture:** New `/admin/*` route group inside the existing `integrity-web-creations-v2` Astro 6 SSR app. Supabase (Postgres + Auth + RLS + Storage) is the backend. Admin pages and API routes are on-demand rendered (`prerender = false`); the public marketing site stays static. An Astro middleware gates every `/admin/*` route on an authenticated, MFA-elevated, allowlisted session. All money is integer cents; pure business logic (money math, totals, invoice numbering, status transitions, detail snapshots) lives in unit-tested modules under `src/lib/`.

**Tech Stack:** Astro 6, `@supabase/supabase-js`, `@supabase/ssr` (cookie sessions), Supabase Auth TOTP MFA, `zod` (validation), Vitest (unit tests), Tailwind 4, `puppeteer-core` + `@sparticuz/chromium` (PDF spike), Vercel.

**Spec:** `docs/superpowers/specs/2026-06-07-iwc-crm-invoicing-design.md`
**Branch:** `feat/admin-crm-invoicing`

---

## ⚙️ ARCHITECTURE UPDATE (2026-06-07) — read before any task

The CRM **reuses an existing Supabase project** instead of a new one (cost decision). These deltas OVERRIDE the task text below wherever they conflict:

- **Project:** `umami-analytics`, ref **`oumrxmzstbcukvtylmcc`**, region us-east-1. URL `https://oumrxmzstbcukvtylmcc.supabase.co`. (Org: Integrity Web Creations `xczhqjekanvhsqzsbkcx`.)
- **Dedicated schema:** ALL CRM tables, functions, and the settings row live in a new **`crm`** Postgres schema — never `public` (that schema belongs to umami). Every `create table` is `crm.<name>`; the number RPC is `crm.allocate_invoice_number()`.
- **PostgREST exposure:** `crm` must be added to the project's Exposed Schemas (Dashboard → Settings → API → Exposed schemas: add `crm`) so supabase-js can reach it. One-time manual step in Task 0.1.
- **Client default schema:** both Supabase clients (Task 0.7) pass `db: { schema: 'crm' }` so `.from('clients')` resolves to `crm.clients` with no per-call `.schema()`.
- **`is_admin()`** helper lives in `public` (so storage.objects policies can call it); CRM RLS policies call `public.is_admin()`.
- **No project creation / no separate dev project.** Task 0.1 becomes: retrieve URL + keys for the existing project, write `.env`, add `crm` to exposed schemas. Service-role key is fetched from the Dashboard (MCP does not expose it) and is only required from Phase 2 onward.
- **Task 0.10 (seed user):** the project's Supabase Auth (`auth.users`) is unused by umami (umami uses direct Postgres + its own `public.user` table), so creating the single admin user + disabling public signups is safe and does not affect umami.
- **Pre-existing fix applied:** migration `enable_rls_umami_tables` enabled RLS on all 18 umami `public.*` tables (they were exposed). Do not add policies to them — deny-all via PostgREST is intended; umami bypasses RLS via its direct connection.

---

## Conventions (read once before starting)

- **Money:** never floats. Integers in cents everywhere; format only at the view edge via `formatUSD()`.
- **Env access:** `import.meta.env.X` (matches existing `api/contact.ts`). Server-only secrets must never be prefixed `PUBLIC_`.
- **SSR:** every admin page and API route exports `export const prerender = false;`.
- **Tests:** pure logic in `src/lib/**` is TDD'd with Vitest (`*.test.ts` beside the module). Astro `.astro` pages are verified manually via the preview workflow (steps included); we do not unit-test rendered HTML.
- **Commits:** one per task, conventional-commit style, on `feat/admin-crm-invoicing`.
- **DB changes:** every schema change is a SQL migration file in `supabase/migrations/` AND applied to the **dev** Supabase project. Production is applied only at a gate.

### File structure created across these phases

```
integrity-web-creations-v2/
├─ supabase/
│  └─ migrations/
│     ├─ 0001_core_schema.sql           # all tables (Phase 0)
│     ├─ 0002_rls_policies.sql          # RLS lockdown (Phase 0)
│     ├─ 0003_invoice_number_rpc.sql    # atomic numbering fn (Phase 2)
│     └─ 0004_storage_buckets.sql       # logo + invoice-pdf buckets (Phase 1/2)
├─ src/
│  ├─ middleware.ts                     # auth gate for /admin/* (Phase 0)
│  ├─ lib/
│  │  ├─ money.ts            (+ money.test.ts)        # Phase 0
│  │  ├─ supabase/
│  │  │  ├─ admin.ts                                  # service-role client (Phase 0)
│  │  │  └─ server.ts                                 # per-request SSR client (Phase 0)
│  │  ├─ auth.ts                                      # session/allowlist helpers (Phase 0)
│  │  ├─ http.ts            (+ http.test.ts)          # json()/error helpers (Phase 0)
│  │  ├─ validation.ts      (+ validation.test.ts)    # zod schemas (Phase 1)
│  │  ├─ invoice/
│  │  │  ├─ totals.ts       (+ totals.test.ts)        # Phase 2
│  │  │  ├─ status.ts       (+ status.test.ts)        # Phase 2
│  │  │  ├─ snapshot.ts     (+ snapshot.test.ts)      # Phase 2
│  │  │  └─ pdf.ts                                    # Phase 2
│  │  └─ db/
│  │     ├─ clients.ts                                # Phase 1
│  │     ├─ services.ts                               # Phase 1
│  │     ├─ settings.ts                               # Phase 1
│  │     ├─ invoices.ts                               # Phase 2
│  │     └─ payments.ts                               # Phase 2
│  ├─ layouts/
│  │  └─ AdminLayout.astro                            # Phase 0
│  ├─ components/admin/
│  │  ├─ Sidebar.astro                                # Phase 0
│  │  └─ MoneyInput.astro                             # Phase 1
│  └─ pages/
│     ├─ admin/
│     │  ├─ login.astro                               # Phase 0
│     │  ├─ setup-2fa.astro                           # Phase 0
│     │  ├─ index.astro                               # Phase 0 (placeholder dashboard)
│     │  ├─ clients/ index.astro · new.astro · [id].astro      # Phase 1
│     │  ├─ services/ index.astro · new.astro · [id].astro     # Phase 1
│     │  ├─ settings.astro                            # Phase 1
│     │  └─ invoices/ index.astro · new.astro · [id].astro     # Phase 2
│     ├─ i/
│     │  └─ [token].astro                             # Phase 2 public invoice page
│     └─ api/admin/
│        ├─ auth/ login.ts · logout.ts · mfa-enroll.ts · mfa-verify.ts   # Phase 0
│        ├─ clients/ index.ts · [id].ts              # Phase 1
│        ├─ services/ index.ts · [id].ts             # Phase 1
│        ├─ settings.ts                               # Phase 1
│        ├─ invoices/ index.ts · [id].ts · [id]/send.ts · [id]/duplicate.ts · [id]/void.ts · [id]/pdf.ts  # Phase 2
│        └─ payments/ index.ts                        # Phase 2
└─ vitest.config.ts                                   # Phase 0
```

---

# PHASE 0 — Foundation

**Outcome:** A deployed app where visiting `/admin` redirects to a login; logging in with the single allowlisted account + TOTP code reaches an (empty) dashboard; the full DB schema exists with RLS denying all anonymous access; Vitest runs.

## Task 0.1: Provision Supabase dev project + capture env

**Files:**
- Create: `.env` (local, git-ignored), update `.env.example`

- [ ] **Step 1: Create a dedicated DEV Supabase project**

Use the Supabase MCP (`create_project`) or dashboard. Name: `iwc-crm-dev`. Region: closest US. Capture the project ref, URL, anon (publishable) key, and service-role key.

- [ ] **Step 2: Add env vars to `.env`** (do NOT commit; `.env` is already git-ignored)

```bash
# Supabase (DEV)
SUPABASE_URL=https://<dev-ref>.supabase.co
SUPABASE_ANON_KEY=<dev-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<dev-service-role-key>

# Admin allowlist — only this email may authenticate
ADMIN_ALLOWLIST_EMAIL=asmalls@integritywebcreations.com

# Stripe (TEST mode — scaffolding only; used in Phase 3)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Cron + email come online in Phase 3/4
CRON_SECRET=<generate-a-long-random-string>
```

- [ ] **Step 3: Mirror keys (without values) into `.env.example`** and commit that file only.

```bash
git add .env.example
git commit -m "chore: document CRM env vars in .env.example"
```

## Task 0.2: Install dependencies

**Files:** Modify `package.json`

- [ ] **Step 1: Install runtime + dev deps**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D vitest
```

- [ ] **Step 2: Add the test script to `package.json`**

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "astro": "astro",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase, zod, vitest deps"
```

## Task 0.3: Vitest config + first money module (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/money.ts`, `src/lib/money.test.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Write the failing test `src/lib/money.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { formatUSD, dollarsToCents, centsToDollars, addCents } from './money';

describe('money', () => {
  it('formats cents as USD', () => {
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(3500)).toBe('$35.00');
    expect(formatUSD(199999)).toBe('$1,999.99');
  });
  it('parses dollar strings to integer cents', () => {
    expect(dollarsToCents('35')).toBe(3500);
    expect(dollarsToCents('35.5')).toBe(3550);
    expect(dollarsToCents('1,999.99')).toBe(199999);
    expect(dollarsToCents('')).toBe(0);
  });
  it('round-trips without float drift', () => {
    expect(centsToDollars(199999)).toBe('1999.99');
  });
  it('adds a list of cents safely', () => {
    expect(addCents([1001, 2002, 3003])).toBe(6006);
  });
  it('rejects negative or non-numeric input', () => {
    expect(() => dollarsToCents('abc')).toThrow();
    expect(() => dollarsToCents('-5')).toThrow();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- money`
Expected: FAIL (`Cannot find module './money'`).

- [ ] **Step 4: Implement `src/lib/money.ts`**

```ts
/** All monetary values are integer cents. Format only at the view edge. */

export function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(cents / 100);
}

export function dollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/,/g, '');
  if (cleaned === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid money value: "${input}"`);
  }
  const [whole, frac = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return cents;
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function addCents(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}
```

- [ ] **Step 5: Run test, verify PASS**

Run: `npm test -- money`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: add tested integer-cents money module + vitest"
```

## Task 0.4: HTTP response helpers (TDD)

**Files:** Create `src/lib/http.ts`, `src/lib/http.test.ts`

- [ ] **Step 1: Failing test `src/lib/http.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { json, badRequest } from './http';

describe('http helpers', () => {
  it('builds a JSON response with status + content-type', async () => {
    const res = json({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ ok: true });
  });
  it('badRequest returns 400 with error message', async () => {
    const res = badRequest('nope');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'nope' });
  });
});
```

- [ ] **Step 2: Run, verify FAIL.** Run: `npm test -- http`

- [ ] **Step 3: Implement `src/lib/http.ts`**

```ts
export function json(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
export const badRequest = (msg: string) => json({ error: msg }, 400);
export const unauthorized = (msg = 'Unauthorized') => json({ error: msg }, 401);
export const unprocessable = (msg: string) => json({ error: msg }, 422);
export const serverError = (msg = 'Server error') => json({ error: msg }, 500);
```

- [ ] **Step 4: Run, verify PASS.** Run: `npm test -- http`

- [ ] **Step 5: Commit**

```bash
git add src/lib/http.ts src/lib/http.test.ts
git commit -m "feat: add HTTP response helpers"
```

## Task 0.5: Core database schema migration

**Files:** Create `supabase/migrations/0001_core_schema.sql`

- [ ] **Step 1: Write the migration** — all tables per spec §4. Money columns are `integer` cents.

```sql
-- 0001_core_schema.sql — IWC CRM core schema
create extension if not exists pgcrypto;

-- updated_at trigger helper
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create table clients (
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
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();

create table services (
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
create trigger trg_services_updated before update on services
  for each row execute function set_updated_at();

create table app_settings (
  id boolean primary key default true check (id),          -- single-row guard
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
create trigger trg_settings_updated before update on app_settings
  for each row execute function set_updated_at();
insert into app_settings (id) values (true) on conflict do nothing;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,                              -- null until sent
  client_id uuid not null references clients(id),
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
create index on invoices (client_id);
create index on invoices (status);
create trigger trg_invoices_updated before update on invoices
  for each row execute function set_updated_at();

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  service_id uuid references services(id),
  description text not null,
  quantity numeric not null default 1,
  unit_price_cents integer not null default 0,
  amount_cents integer not null default 0,
  taxable boolean not null default false,
  sort_order integer not null default 0
);
create index on invoice_line_items (invoice_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('stripe','check','zelle','cash','other')),
  reference text,
  stripe_payment_intent_id text,
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index on payments (invoice_id);

create table recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  name text not null,
  line_items jsonb not null default '[]',
  interval text not null check (interval in ('monthly','quarterly','annual')),
  interval_count integer not null default 1,
  next_run_date date not null,
  auto_send boolean not null default false,
  active boolean not null default true,
  last_generated_period text,
  last_invoice_id uuid references invoices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_recurring_updated before update on recurring_schedules
  for each row execute function set_updated_at();

create table email_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null check (key in ('invoice_send','reminder','receipt','owner_alert')),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  detail jsonb,
  occurred_at timestamptz not null default now()
);
create index on activity_log (entity_type, entity_id);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);
```

- [ ] **Step 2: Apply to the DEV project** via Supabase MCP `apply_migration` (name `0001_core_schema`) or the SQL editor.

- [ ] **Step 3: Verify** with `list_tables` (MCP) — confirm all 10 tables exist.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_core_schema.sql
git commit -m "feat(db): core CRM schema (integer cents, snapshots, idempotency)"
```

## Task 0.6: Row Level Security lockdown

**Files:** Create `supabase/migrations/0002_rls_policies.sql`

**Design:** Enable RLS on every table. Grant full access only to `authenticated` users whose JWT email equals the allowlist (enforced again in app middleware). `anon` gets **nothing** — the public invoice page reads through the service role in a server route, never directly. The allowlist email is embedded via a DB setting so policies stay declarative.

- [ ] **Step 1: Write `0002_rls_policies.sql`**

```sql
-- Lock the allowlisted admin email into a DB-level GUC default.
-- Set this once per project: alter database postgres set app.admin_email = 'asmalls@integritywebcreations.com';

create or replace function is_admin() returns boolean as $$
  select coalesce(
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true),
    false
  );
$$ language sql stable;

do $$
declare t text;
begin
  foreach t in array array[
    'clients','services','app_settings','invoices','invoice_line_items',
    'payments','recurring_schedules','email_templates','activity_log','webhook_events'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists admin_all on %I;', t);
    execute format(
      'create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin());', t);
  end loop;
end $$;
```

- [ ] **Step 2: Set the admin email GUC on the DEV database** (one-time, via SQL editor):

```sql
alter database postgres set app.admin_email = 'asmalls@integritywebcreations.com';
```

- [ ] **Step 3: Apply migration `0002_rls_policies`** to DEV.

- [ ] **Step 4: Verify RLS denies anon.** Run via MCP `execute_sql` using the anon context (or curl the REST endpoint with the anon key): `select * from clients;` Expected: empty / permission denied, not data.

- [ ] **Step 5: Run Supabase advisors** (MCP `get_advisors`, type `security`) and confirm no "RLS disabled" warnings remain.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "feat(db): RLS lockdown — admin-only, anon denied"
```

## Task 0.7: Supabase clients (admin + per-request SSR)

**Files:** Create `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`

- [ ] **Step 1: `src/lib/supabase/admin.ts`** — service-role client, server-only, bypasses RLS. NEVER import into a `.astro` component that ships to the client.

```ts
import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 2: `src/lib/supabase/server.ts`** — per-request client bound to the user's cookies (RLS-scoped). Uses `@supabase/ssr`.

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function getServerClient(cookies: AstroCookies) {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env not configured');
  return createServerClient(url, key, {
    cookies: {
      get: (name: string) => cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) =>
        cookies.set(name, value, { ...options, path: '/', httpOnly: true, sameSite: 'lax', secure: true }),
      remove: (name: string, options: CookieOptions) =>
        cookies.delete(name, { ...options, path: '/' }),
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: supabase admin + SSR clients"
```

## Task 0.8: Auth/session helpers

**Files:** Create `src/lib/auth.ts`

- [ ] **Step 1: Implement `src/lib/auth.ts`** — resolve the current admin session and enforce MFA elevation (`aal2`) + allowlist.

```ts
import type { AstroCookies } from 'astro';
import { getServerClient } from './supabase/server';

const ALLOWLIST = () => import.meta.env.ADMIN_ALLOWLIST_EMAIL as string;

export interface AdminSession {
  email: string;
  aal: string;          // 'aal1' (password only) | 'aal2' (MFA satisfied)
  needsMfa: boolean;    // true when user has a factor but hasn't satisfied it
}

export async function getAdminSession(cookies: AstroCookies): Promise<AdminSession | null> {
  const sb = getServerClient(cookies);
  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.email !== ALLOWLIST()) return null;

  const { data: aalData } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  const current = aalData?.currentLevel ?? 'aal1';
  const next = aalData?.nextLevel ?? 'aal1';
  return {
    email: user.email!,
    aal: current,
    needsMfa: next === 'aal2' && current === 'aal1',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: admin session + MFA assurance helper"
```

## Task 0.9: Middleware gate for `/admin/*`

**Files:** Create `src/middleware.ts`

- [ ] **Step 1: Implement `src/middleware.ts`**

```ts
import { defineMiddleware } from 'astro:middleware';
import { getAdminSession } from './lib/auth';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return next();
  }
  if (PUBLIC_ADMIN_PATHS.includes(pathname) || pathname === '/api/admin/auth/login') {
    return next();
  }

  const session = await getAdminSession(ctx.cookies);
  if (!session) {
    return ctx.redirect('/admin/login');
  }
  if (session.needsMfa && pathname !== '/admin/setup-2fa') {
    return ctx.redirect('/admin/setup-2fa');
  }
  ctx.locals.admin = session;
  return next();
});
```

- [ ] **Step 2: Declare `locals.admin` type.** Create `src/env.d.ts`:

```ts
/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    admin?: import('./lib/auth').AdminSession;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/env.d.ts
git commit -m "feat: middleware gating /admin and /api/admin"
```

## Task 0.10: Seed the single admin user

- [ ] **Step 1: Create the admin user** in the DEV Supabase dashboard → Authentication → Add user → email = allowlist email, set a strong password, mark email confirmed.

- [ ] **Step 2: Disable public signups** in Authentication → Providers/Settings (turn off "Allow new users to sign up").

- [ ] **Step 3: Verify** no other users exist.

(No commit — dashboard config.)

## Task 0.11: Login API + page (password step)

**Files:** Create `src/pages/api/admin/auth/login.ts`, `src/pages/api/admin/auth/logout.ts`, `src/pages/admin/login.astro`

- [ ] **Step 1: `src/pages/api/admin/auth/login.ts`**

```ts
import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { badRequest, json, unprocessable } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (email !== (import.meta.env.ADMIN_ALLOWLIST_EMAIL as string).toLowerCase()) {
    return unprocessable('Invalid credentials');
  }
  const sb = getServerClient(cookies);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return unprocessable('Invalid credentials');
  return json({ success: true });
};
```

- [ ] **Step 2: `src/pages/api/admin/auth/logout.ts`**

```ts
import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { json } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  await getServerClient(cookies).auth.signOut();
  return json({ success: true });
};
```

- [ ] **Step 3: `src/pages/admin/login.astro`** — minimal, no admin layout (unauthenticated).

```astro
---
export const prerender = false;
---
<html lang="en"><head><meta charset="utf-8" /><title>Admin Login — IWC</title>
<meta name="robots" content="noindex" /></head>
<body class="min-h-screen grid place-items-center bg-slate-100 font-sans">
  <form id="f" class="w-80 rounded-xl bg-white p-6 shadow space-y-3">
    <h1 class="text-lg font-bold">IWC Admin</h1>
    <input id="email" type="email" placeholder="Email" required class="w-full rounded border p-2" />
    <input id="password" type="password" placeholder="Password" required class="w-full rounded border p-2" />
    <p id="err" class="text-sm text-red-600 hidden"></p>
    <button class="w-full rounded bg-blue-700 p-2 font-semibold text-white">Sign in</button>
  </form>
  <script>
    const f = document.getElementById('f');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('err');
      err.classList.add('hidden');
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (document.getElementById('email') as HTMLInputElement).value,
          password: (document.getElementById('password') as HTMLInputElement).value,
        }),
      });
      if (res.ok) { window.location.href = '/admin'; }
      else { const j = await res.json(); err.textContent = j.error ?? 'Login failed'; err.classList.remove('hidden'); }
    });
  </script>
</body></html>
```

- [ ] **Step 4: Manual verify (preview).** Start dev server (`preview_start`), open `/admin` → expect redirect to `/admin/login`. Submit wrong password → "Invalid credentials". Submit correct password → redirect to `/admin/setup-2fa` (because no factor enrolled yet → `needsMfa` true). Capture console for errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/admin/auth/login.ts src/pages/api/admin/auth/logout.ts src/pages/admin/login.astro
git commit -m "feat: admin password login + logout"
```

## Task 0.12: TOTP enrollment + verification

**Files:** Create `src/pages/api/admin/auth/mfa-enroll.ts`, `src/pages/api/admin/auth/mfa-verify.ts`, `src/pages/admin/setup-2fa.astro`

- [ ] **Step 1: `mfa-enroll.ts`** — starts TOTP enrollment, returns QR + factorId.

```ts
import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { json, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
  if (error || !data) return serverError(error?.message ?? 'Enroll failed');
  return json({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
};
```

- [ ] **Step 2: `mfa-verify.ts`** — challenge + verify a 6-digit code; on success the session becomes `aal2`.

```ts
import type { APIRoute } from 'astro';
import { getServerClient } from '../../../../lib/supabase/server';
import { badRequest, json, unprocessable } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { factorId?: string; code?: string };
  try { body = await request.json(); } catch { return badRequest('Invalid JSON'); }
  if (!body.factorId || !body.code) return badRequest('Missing factorId or code');
  const sb = getServerClient(cookies);
  const challenge = await sb.auth.mfa.challenge({ factorId: body.factorId });
  if (challenge.error) return unprocessable(challenge.error.message);
  const verify = await sb.auth.mfa.verify({
    factorId: body.factorId,
    challengeId: challenge.data.id,
    code: body.code,
  });
  if (verify.error) return unprocessable('Invalid code');
  return json({ success: true });
};
```

- [ ] **Step 3: `src/pages/admin/setup-2fa.astro`** — shows QR on first run; if a factor already exists, shows only the code field. (For the single user, first visit enrolls; later visits after re-login verify.)

```astro
---
export const prerender = false;
---
<html lang="en"><head><meta charset="utf-8" /><title>Two-Factor — IWC</title>
<meta name="robots" content="noindex" /></head>
<body class="min-h-screen grid place-items-center bg-slate-100 font-sans">
  <div class="w-96 rounded-xl bg-white p-6 shadow space-y-3">
    <h1 class="text-lg font-bold">Set up / confirm 2FA</h1>
    <button id="enroll" class="rounded bg-slate-200 px-3 py-1 text-sm">Show QR to enroll</button>
    <img id="qr" class="hidden mx-auto" alt="TOTP QR" />
    <input id="code" inputmode="numeric" placeholder="6-digit code" class="w-full rounded border p-2" />
    <p id="err" class="text-sm text-red-600 hidden"></p>
    <button id="verify" class="w-full rounded bg-blue-700 p-2 font-semibold text-white">Verify</button>
  </div>
  <script>
    let factorId: string | null = null;
    const err = document.getElementById('err')!;
    document.getElementById('enroll')!.addEventListener('click', async () => {
      const res = await fetch('/api/admin/auth/mfa-enroll', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) { err.textContent = j.error; err.classList.remove('hidden'); return; }
      factorId = j.factorId;
      const img = document.getElementById('qr') as HTMLImageElement;
      img.src = j.qr; img.classList.remove('hidden');
    });
    document.getElementById('verify')!.addEventListener('click', async () => {
      err.classList.add('hidden');
      const code = (document.getElementById('code') as HTMLInputElement).value.trim();
      const res = await fetch('/api/admin/auth/mfa-verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      });
      if (res.ok) { window.location.href = '/admin'; }
      else { const j = await res.json(); err.textContent = j.error; err.classList.remove('hidden'); }
    });
  </script>
</body></html>
```

> Note: when a factor already exists from a prior session, `mfa-enroll` will error; the page still works for verify if `factorId` is fetched from `sb.auth.mfa.listFactors()`. Add a GET branch later if needed — for the single-user first-run flow this is sufficient.

- [ ] **Step 4: Manual verify (preview).** After password login → land on `/admin/setup-2fa` → click enroll → scan QR with authenticator → enter code → reach `/admin`. Reload `/admin` → stays (session is `aal2`).

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/admin/auth/mfa-enroll.ts src/pages/api/admin/auth/mfa-verify.ts src/pages/admin/setup-2fa.astro
git commit -m "feat: TOTP 2FA enrollment + verification"
```

## Task 0.13: Admin layout, sidebar, placeholder dashboard

**Files:** Create `src/layouts/AdminLayout.astro`, `src/components/admin/Sidebar.astro`, `src/pages/admin/index.astro`

- [ ] **Step 1: `src/components/admin/Sidebar.astro`**

```astro
---
const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/invoices', label: 'Invoices' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/settings', label: 'Settings' },
];
const { path } = Astro.props;
---
<nav class="w-56 shrink-0 border-r bg-white p-4 space-y-1">
  <p class="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">IWC Admin</p>
  {links.map((l) => (
    <a href={l.href}
       class:list={["block rounded px-3 py-2 text-sm font-medium",
         path === l.href ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"]}>
      {l.label}
    </a>
  ))}
  <button id="logout" class="mt-6 block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Sign out</button>
</nav>
<script>
  document.getElementById('logout')?.addEventListener('click', async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });
</script>
```

- [ ] **Step 2: `src/layouts/AdminLayout.astro`**

```astro
---
export const prerender = false;
import Sidebar from '../components/admin/Sidebar.astro';
import '../styles/global.css';
const { title } = Astro.props;
const path = Astro.url.pathname;
---
<html lang="en"><head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>{title} — IWC Admin</title>
</head>
<body class="min-h-screen bg-slate-50 font-sans text-slate-900">
  <div class="flex min-h-screen">
    <Sidebar path={path} />
    <main class="flex-1 p-8"><slot /></main>
  </div>
</body></html>
```

- [ ] **Step 3: `src/pages/admin/index.astro`** (placeholder dashboard; real metrics arrive in Phase 5)

```astro
---
export const prerender = false;
import AdminLayout from '../../layouts/AdminLayout.astro';
const admin = Astro.locals.admin!;
---
<AdminLayout title="Dashboard">
  <h1 class="text-2xl font-bold">Dashboard</h1>
  <p class="mt-2 text-slate-600">Signed in as {admin.email}. Metrics arrive in Phase 5.</p>
</AdminLayout>
```

- [ ] **Step 4: Manual verify (preview).** `/admin` renders the shell; sidebar links present; "Sign out" returns to login.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/AdminLayout.astro src/components/admin/Sidebar.astro src/pages/admin/index.astro
git commit -m "feat: admin layout, sidebar, placeholder dashboard"
```

## Task 0.14: CSP + noindex for admin

**Files:** Modify `vercel.json`; add `robots.txt` rule

- [ ] **Step 1: Extend CSP `connect-src`** in `vercel.json` to allow the Supabase project origin (needed for any client-side auth calls and future realtime). Add `https://<dev-ref>.supabase.co` (and the prod ref at the gate) to `connect-src`.

```jsonc
// in the CSP value, change connect-src to:
"connect-src 'self' https://analytics.integritywebcreations.com https://*.supabase.co;"
```

- [ ] **Step 2: Disallow `/admin` and `/i/` in `public/robots.txt`** (create/append):

```
User-agent: *
Disallow: /admin
Disallow: /i/
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json public/robots.txt
git commit -m "chore: CSP for supabase + noindex admin/invoice routes"
```

---

## ✅ GATE 0 — Review before Phase 1

Stop and verify before continuing:
- [ ] `npm test` passes (money + http modules).
- [ ] `npm run build` succeeds.
- [ ] Visiting `/admin` unauthenticated → redirect to login.
- [ ] Wrong password rejected; correct password + TOTP → dashboard.
- [ ] Direct REST call with anon key to any table returns no rows (RLS verified).
- [ ] `get_advisors` (security) is clean.
- [ ] Spec §8 security items implemented so far are checked off.

**Human review checkpoint.** Do not proceed to Phase 1 until approved.

---

# PHASE 1 — Records (Clients · Services · Settings)

**Outcome:** Full CRUD for clients and services, plus an editable settings/branding page with logo upload. All writes validated with zod, all reads/writes RLS-scoped through the SSR client.

## Task 1.1: Validation schemas (TDD)

**Files:** Create `src/lib/validation.ts`, `src/lib/validation.test.ts`

- [ ] **Step 1: Failing test** covering client + service parsing (valid, missing required name, bad email, negative price rejected).

```ts
import { describe, it, expect } from 'vitest';
import { clientSchema, serviceSchema } from './validation';

describe('clientSchema', () => {
  it('accepts a minimal valid client', () => {
    expect(clientSchema.parse({ name: 'Acme' }).name).toBe('Acme');
  });
  it('rejects empty name', () => {
    expect(clientSchema.safeParse({ name: '' }).success).toBe(false);
  });
  it('rejects malformed email', () => {
    expect(clientSchema.safeParse({ name: 'A', email: 'nope' }).success).toBe(false);
  });
});
describe('serviceSchema', () => {
  it('requires non-negative price', () => {
    expect(serviceSchema.safeParse({ name: 'Hosting', default_unit_price_cents: -1 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.** `npm test -- validation`

- [ ] **Step 3: Implement `src/lib/validation.ts`**

```ts
import { z } from 'zod';

const optionalEmail = z.string().email().optional().or(z.literal('').transform(() => undefined));

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  business_name: z.string().trim().max(200).optional(),
  email: optionalEmail,
  phone: z.string().trim().max(40).optional(),
  address_line1: z.string().trim().max(200).optional(),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(50).optional(),
  postal_code: z.string().trim().max(20).optional(),
  country: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(5000).optional(),
  status: z.enum(['active', 'archived']).optional(),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  default_unit_price_cents: z.number().int().nonnegative(),
  default_quantity: z.number().positive().default(1),
  taxable: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type ServiceInput = z.infer<typeof serviceSchema>;
```

- [ ] **Step 4: Run, verify PASS.** `npm test -- validation`

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: zod validation schemas for clients + services"
```

## Task 1.2: Clients data-access module

**Files:** Create `src/lib/db/clients.ts`

- [ ] **Step 1: Implement** thin DB functions over the SSR client (RLS enforced). Each takes the request `cookies`.

```ts
import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import type { ClientInput } from '../validation';

export async function listClients(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').select('*').order('name');
  if (error) throw error;
  return data;
}
export async function getClient(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function createClient(cookies: AstroCookies, input: ClientInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').insert(input).select().single();
  if (error) throw error;
  return data;
}
export async function updateClient(cookies: AstroCookies, id: string, input: ClientInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('clients').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function archiveClient(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { error } = await sb.from('clients').update({ status: 'archived' }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/clients.ts
git commit -m "feat: clients data-access module"
```

## Task 1.3: Clients API routes

**Files:** Create `src/pages/api/admin/clients/index.ts`, `src/pages/api/admin/clients/[id].ts`

- [ ] **Step 1: `index.ts`** — POST create.

```ts
import type { APIRoute } from 'astro';
import { clientSchema } from '../../../../lib/validation';
import { createClient } from '../../../../lib/db/clients';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const client = await createClient(cookies, parsed.data);
    return json({ client }, 201);
  } catch (e) { console.error(e); return serverError(); }
};
```

- [ ] **Step 2: `[id].ts`** — PUT update, DELETE archive.

```ts
import type { APIRoute } from 'astro';
import { clientSchema } from '../../../../lib/validation';
import { updateClient, archiveClient } from '../../../../lib/db/clients';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  let raw: unknown;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try {
    const client = await updateClient(cookies, params.id!, parsed.data);
    return json({ client });
  } catch (e) { console.error(e); return serverError(); }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try { await archiveClient(cookies, params.id!); return json({ success: true }); }
  catch (e) { console.error(e); return serverError(); }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/admin/clients/
git commit -m "feat: clients API (create/update/archive)"
```

## Task 1.4: Clients UI (list, new, detail/edit)

**Files:** Create `src/pages/admin/clients/index.astro`, `new.astro`, `[id].astro`

- [ ] **Step 1: `index.astro`** — server-render the list via `listClients`.

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { listClients } from '../../../lib/db/clients';
const clients = await listClients(Astro.cookies);
---
<AdminLayout title="Clients">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Clients</h1>
    <a href="/admin/clients/new" class="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">New client</a>
  </div>
  <table class="mt-6 w-full text-sm">
    <thead><tr class="text-left text-slate-500"><th class="p-2">Name</th><th>Business</th><th>Email</th><th>Status</th></tr></thead>
    <tbody>
      {clients.map((c) => (
        <tr class="border-t hover:bg-slate-50">
          <td class="p-2"><a class="font-medium text-blue-700" href={`/admin/clients/${c.id}`}>{c.name}</a></td>
          <td>{c.business_name}</td><td>{c.email}</td><td>{c.status}</td>
        </tr>
      ))}
    </tbody>
  </table>
</AdminLayout>
```

- [ ] **Step 2: `new.astro`** — a form posting to `/api/admin/clients`. Include fields: name (required), business_name, email, phone, address_line1/2, city, state, postal_code, notes. On success redirect to the detail page. (Reuse a small inline `<script>` fetch pattern like login.)

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
---
<AdminLayout title="New Client">
  <h1 class="text-2xl font-bold">New client</h1>
  <form id="f" class="mt-6 grid max-w-xl grid-cols-2 gap-3">
    <input name="name" placeholder="Name *" required class="col-span-2 rounded border p-2" />
    <input name="business_name" placeholder="Business" class="rounded border p-2" />
    <input name="email" type="email" placeholder="Email" class="rounded border p-2" />
    <input name="phone" placeholder="Phone" class="rounded border p-2" />
    <input name="address_line1" placeholder="Address" class="rounded border p-2" />
    <input name="city" placeholder="City" class="rounded border p-2" />
    <input name="state" placeholder="State" class="rounded border p-2" />
    <input name="postal_code" placeholder="ZIP" class="rounded border p-2" />
    <textarea name="notes" placeholder="Notes" class="col-span-2 rounded border p-2"></textarea>
    <p id="err" class="col-span-2 hidden text-sm text-red-600"></p>
    <button class="col-span-2 rounded bg-blue-700 p-2 font-semibold text-white">Save</button>
  </form>
  <script>
    document.getElementById('f')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      const body = Object.fromEntries(fd.entries());
      const res = await fetch('/api/admin/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await res.json();
      const err = document.getElementById('err')!;
      if (res.ok) window.location.href = `/admin/clients/${j.client.id}`;
      else { err.textContent = j.error; err.classList.remove('hidden'); }
    });
  </script>
</AdminLayout>
```

- [ ] **Step 3: `[id].astro`** — detail view + edit form (PUT) + archive (DELETE). Shows the client's invoices table once Phase 2 exists (leave a placeholder section now). Pre-fill the same fields from `getClient`.

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { getClient } from '../../../lib/db/clients';
const c = await getClient(Astro.cookies, Astro.params.id!);
---
<AdminLayout title={c.name}>
  <h1 class="text-2xl font-bold">{c.name}</h1>
  <form id="f" class="mt-6 grid max-w-xl grid-cols-2 gap-3" data-id={c.id}>
    <input name="name" value={c.name} required class="col-span-2 rounded border p-2" />
    <input name="business_name" value={c.business_name ?? ''} class="rounded border p-2" />
    <input name="email" value={c.email ?? ''} class="rounded border p-2" />
    <input name="phone" value={c.phone ?? ''} class="rounded border p-2" />
    <input name="address_line1" value={c.address_line1 ?? ''} class="rounded border p-2" />
    <input name="city" value={c.city ?? ''} class="rounded border p-2" />
    <input name="state" value={c.state ?? ''} class="rounded border p-2" />
    <input name="postal_code" value={c.postal_code ?? ''} class="rounded border p-2" />
    <textarea name="notes" class="col-span-2 rounded border p-2">{c.notes ?? ''}</textarea>
    <p id="err" class="col-span-2 hidden text-sm text-red-600"></p>
    <div class="col-span-2 flex gap-2">
      <button class="rounded bg-blue-700 px-4 py-2 font-semibold text-white">Save</button>
      <button type="button" id="archive" class="rounded bg-slate-200 px-4 py-2">Archive</button>
    </div>
  </form>
  <section class="mt-10"><h2 class="font-semibold text-slate-500">Invoices</h2><p class="text-sm text-slate-400">Appears in Phase 2.</p></section>
  <script>
    const form = document.getElementById('f') as HTMLFormElement;
    const id = form.dataset.id;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const err = document.getElementById('err')!;
      if (res.ok) location.reload();
      else { err.textContent = (await res.json()).error; err.classList.remove('hidden'); }
    });
    document.getElementById('archive')!.addEventListener('click', async () => {
      if (!confirm('Archive this client?')) return;
      await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
      window.location.href = '/admin/clients';
    });
  </script>
</AdminLayout>
```

- [ ] **Step 4: Manual verify (preview).** Create a client → lands on detail → edit a field → save → reload shows change → list shows it → archive removes from default list view.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/clients/
git commit -m "feat: clients UI (list, create, edit, archive)"
```

## Task 1.5: Services (presets) — module, API, UI

**Files:** Create `src/lib/db/services.ts`; `src/pages/api/admin/services/index.ts`, `[id].ts`; `src/pages/admin/services/index.astro`, `new.astro`, `[id].astro`

- [ ] **Step 1: `src/lib/db/services.ts`** — same shape as clients module (`listServices`, `getService`, `createService`, `updateService`, `deactivateService`) but on the `services` table; price stored as `default_unit_price_cents`.

```ts
import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import type { ServiceInput } from '../validation';

export async function listServices(cookies: AstroCookies, includeInactive = false) {
  const sb = getServerClient(cookies);
  let q = sb.from('services').select('*').order('name');
  if (!includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function getService(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('services').select('*').eq('id', id).single();
  if (error) throw error; return data;
}
export async function createService(cookies: AstroCookies, input: ServiceInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('services').insert(input).select().single();
  if (error) throw error; return data;
}
export async function updateService(cookies: AstroCookies, id: string, input: ServiceInput) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('services').update(input).eq('id', id).select().single();
  if (error) throw error; return data;
}
export async function deactivateService(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { error } = await sb.from('services').update({ active: false }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: API routes** mirror Task 1.3 using `serviceSchema` and the services module. The form sends a dollar string for price; convert with `dollarsToCents` **in the API route** before validating: build the parsed object `{ ...raw, default_unit_price_cents: dollarsToCents(raw.price) }`.

`src/pages/api/admin/services/index.ts`:
```ts
import type { APIRoute } from 'astro';
import { serviceSchema } from '../../../../lib/validation';
import { createService } from '../../../../lib/db/services';
import { dollarsToCents } from '../../../../lib/money';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  let price: number;
  try { price = dollarsToCents(String(raw.price ?? '0')); } catch { return unprocessable('Invalid price'); }
  const parsed = serviceSchema.safeParse({
    name: raw.name, description: raw.description,
    default_unit_price_cents: price,
    default_quantity: Number(raw.default_quantity ?? 1),
    taxable: raw.taxable === true || raw.taxable === 'on',
    active: true,
  });
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  try { return json({ service: await createService(cookies, parsed.data) }, 201); }
  catch (e) { console.error(e); return serverError(); }
};
```

`src/pages/api/admin/services/[id].ts` follows the same conversion with `PUT` (update) and `DELETE` (deactivate).

- [ ] **Step 3: UI** mirrors Task 1.4 (`index.astro` lists name + `formatUSD(default_unit_price_cents)`; `new.astro`/`[id].astro` forms with fields name, description, price (dollar input), default_quantity, taxable checkbox). Import `formatUSD` from `../../../lib/money`.

- [ ] **Step 4: Manual verify (preview).** Create "Monthly Hosting / $35" → list shows `$35.00` → edit price to `$40` → persists.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/services.ts src/pages/api/admin/services/ src/pages/admin/services/
git commit -m "feat: services (line-item presets) CRUD"
```

## Task 1.6: Storage buckets for logo + invoice PDFs

**Files:** Create `supabase/migrations/0004_storage_buckets.sql`

- [ ] **Step 1: Create private buckets** (run via SQL editor or MCP):

```sql
insert into storage.buckets (id, name, public) values ('branding','branding', false)
  on conflict do nothing;
insert into storage.buckets (id, name, public) values ('invoice-pdfs','invoice-pdfs', false)
  on conflict do nothing;

-- Admin-only access to both buckets
create policy "admin branding" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and is_admin()) with check (bucket_id = 'branding' and is_admin());
create policy "admin pdfs" on storage.objects for all to authenticated
  using (bucket_id = 'invoice-pdfs' and is_admin()) with check (bucket_id = 'invoice-pdfs' and is_admin());
```

- [ ] **Step 2: Apply to DEV; verify buckets exist.**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_storage_buckets.sql
git commit -m "feat(db): private storage buckets for branding + invoice PDFs"
```

## Task 1.7: Settings page (business info, defaults, branding/logo)

**Files:** Create `src/lib/db/settings.ts`; `src/pages/api/admin/settings.ts`; `src/pages/admin/settings.astro`

- [ ] **Step 1: `src/lib/db/settings.ts`** — read/update the single `app_settings` row; upload logo to `branding` bucket.

```ts
import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';

export async function getSettings(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('app_settings').select('*').eq('id', true).single();
  if (error) throw error; return data;
}
export async function updateSettings(cookies: AstroCookies, patch: Record<string, unknown>) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('app_settings').update(patch).eq('id', true).select().single();
  if (error) throw error; return data;
}
export async function uploadLogo(cookies: AstroCookies, file: File) {
  const sb = getServerClient(cookies);
  const path = `logo-${Date.now()}-${file.name}`;
  const { error } = await sb.storage.from('branding').upload(path, file, { upsert: true });
  if (error) throw error;
  await updateSettings(cookies, { logo_storage_path: path });
  return path;
}
```

- [ ] **Step 2: `src/pages/api/admin/settings.ts`** — `PUT` for JSON field updates; `POST` (multipart) for logo upload.

```ts
import type { APIRoute } from 'astro';
import { updateSettings, uploadLogo } from '../../../lib/db/settings';
import { badRequest, json, serverError, unprocessable } from '../../../lib/http';
import { dollarsToCents } from '../../../lib/money';

export const prerender = false;

export const PUT: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const patch: Record<string, unknown> = {
    business_name: raw.business_name,
    address_line1: raw.address_line1, address_line2: raw.address_line2,
    city: raw.city, state: raw.state, postal_code: raw.postal_code,
    reply_to: raw.reply_to, from_email: raw.from_email,
    invoice_number_prefix: raw.invoice_number_prefix,
    default_due_days: Number(raw.default_due_days ?? 14),
    default_tax_rate: Number(raw.default_tax_rate ?? 0),
    default_terms: raw.default_terms, payment_instructions: raw.payment_instructions,
  };
  if (!patch.business_name) return unprocessable('Business name is required');
  try { return json({ settings: await updateSettings(cookies, patch) }); }
  catch (e) { console.error(e); return serverError(); }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const form = await request.formData();
  const file = form.get('logo');
  if (!(file instanceof File)) return badRequest('No file');
  try { return json({ path: await uploadLogo(cookies, file) }); }
  catch (e) { console.error(e); return serverError(); }
};
```

- [ ] **Step 3: `src/pages/admin/settings.astro`** — form prefilled from `getSettings`, PUT on save; separate logo upload input that POSTs multipart. (Use the inline fetch pattern. `next_invoice_number` is shown read-only — it's managed by the numbering RPC in Phase 2.)

- [ ] **Step 4: Manual verify (preview).** Edit business name + default due days → save → reload persists. Upload a logo → no error, `logo_storage_path` set.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/settings.ts src/pages/api/admin/settings.ts src/pages/admin/settings.astro
git commit -m "feat: settings + branding/logo upload"
```

---

## ✅ GATE 1 — Review before Phase 2

- [ ] `npm test` + `npm run build` green.
- [ ] Clients: create/edit/archive works end-to-end.
- [ ] Services: create/edit/deactivate works; prices store/display correctly as cents.
- [ ] Settings: persists; logo uploads to private bucket.
- [ ] No service-role key reachable from any client bundle (grep build output for the key string → none).

**Human review checkpoint.**

---

# PHASE 2 — Invoices (core engine)

**Outcome:** Build/edit draft invoices from presets or custom lines; **send** allocates a gap-free number and snapshots issuer + bill-to; a cached PDF renders; a public `/i/[token]` page displays the invoice; record manual (partial) payments that recompute balance and status; duplicate and void.

## Task 2.1: Invoice totals engine (TDD)

**Files:** Create `src/lib/invoice/totals.ts`, `totals.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { lineAmount, computeTotals } from './totals';

describe('invoice totals', () => {
  it('computes a line amount in cents', () => {
    expect(lineAmount(3, 3500)).toBe(10500);
  });
  it('sums subtotal, applies discount then tax on taxable lines', () => {
    const r = computeTotals({
      lines: [
        { quantity: 1, unit_price_cents: 250000, taxable: false }, // build
        { quantity: 2, unit_price_cents: 3500, taxable: true },    // hosting x2 taxable
      ],
      taxRate: 0.07,
      discountCents: 5000,
    });
    expect(r.subtotalCents).toBe(257000);
    expect(r.discountCents).toBe(5000);
    // tax applies to taxable subtotal (7000) only: round(7000*0.07)=490
    expect(r.taxCents).toBe(490);
    expect(r.totalCents).toBe(257000 - 5000 + 490);
  });
  it('never returns negative total', () => {
    const r = computeTotals({ lines: [{ quantity: 1, unit_price_cents: 1000, taxable: false }], taxRate: 0, discountCents: 99999 });
    expect(r.totalCents).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.** `npm test -- totals`

- [ ] **Step 3: Implement `src/lib/invoice/totals.ts`**

```ts
export interface TotalsLine { quantity: number; unit_price_cents: number; taxable: boolean; }
export interface TotalsInput { lines: TotalsLine[]; taxRate: number; discountCents: number; }
export interface Totals { subtotalCents: number; taxCents: number; discountCents: number; totalCents: number; }

export function lineAmount(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}

export function computeTotals({ lines, taxRate, discountCents }: TotalsInput): Totals {
  const subtotalCents = lines.reduce((s, l) => s + lineAmount(l.quantity, l.unit_price_cents), 0);
  const taxableBase = lines.reduce((s, l) => l.taxable ? s + lineAmount(l.quantity, l.unit_price_cents) : s, 0);
  const taxCents = Math.round(taxableBase * taxRate);
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);
  return { subtotalCents, taxCents, discountCents, totalCents };
}
```

- [ ] **Step 4: Run, verify PASS.** `npm test -- totals`

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice/totals.ts src/lib/invoice/totals.test.ts
git commit -m "feat: invoice totals engine (taxable-line tax, discount, floor at 0)"
```

## Task 2.2: Payment/status recompute engine (TDD)

**Files:** Create `src/lib/invoice/status.ts`, `status.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { applyPayments } from './status';

describe('applyPayments', () => {
  it('marks paid at zero balance', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'sent' }, [{ amount_cents: 10000 }]);
    expect(r).toEqual({ amountPaidCents: 10000, balanceCents: 0, status: 'paid' });
  });
  it('marks partial when underpaid', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'sent' }, [{ amount_cents: 4000 }]);
    expect(r.status).toBe('partial'); expect(r.balanceCents).toBe(6000);
  });
  it('keeps draft/void untouched as paid only when applicable', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'void' }, [{ amount_cents: 10000 }]);
    expect(r.status).toBe('void');
  });
  it('handles overpayment as paid with zero balance floor', () => {
    const r = applyPayments({ totalCents: 10000, currentStatus: 'viewed' }, [{ amount_cents: 12000 }]);
    expect(r.status).toBe('paid'); expect(r.balanceCents).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.** `npm test -- status`

- [ ] **Step 3: Implement `src/lib/invoice/status.ts`**

```ts
export type InvoiceStatus = 'draft'|'sent'|'viewed'|'partial'|'paid'|'overdue'|'void';
export interface RecomputeInput { totalCents: number; currentStatus: InvoiceStatus; }
export interface Recompute { amountPaidCents: number; balanceCents: number; status: InvoiceStatus; }

export function applyPayments(inv: RecomputeInput, payments: { amount_cents: number }[]): Recompute {
  const amountPaidCents = payments.reduce((s, p) => s + p.amount_cents, 0);
  const balanceCents = Math.max(0, inv.totalCents - amountPaidCents);
  if (inv.currentStatus === 'void' || inv.currentStatus === 'draft') {
    return { amountPaidCents, balanceCents, status: inv.currentStatus };
  }
  let status: InvoiceStatus = inv.currentStatus;
  if (balanceCents === 0 && amountPaidCents > 0) status = 'paid';
  else if (amountPaidCents > 0) status = 'partial';
  return { amountPaidCents, balanceCents, status };
}
```

- [ ] **Step 4: Run, verify PASS.** `npm test -- status`

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice/status.ts src/lib/invoice/status.test.ts
git commit -m "feat: payment recompute + status transition engine"
```

## Task 2.3: Detail snapshot builder (TDD)

**Files:** Create `src/lib/invoice/snapshot.ts`, `snapshot.test.ts`

- [ ] **Step 1: Failing test** — builds immutable issuer + bill-to JSON from settings + client at send time.

```ts
import { describe, it, expect } from 'vitest';
import { buildIssuerSnapshot, buildBillToSnapshot } from './snapshot';

describe('snapshots', () => {
  it('captures issuer fields from settings', () => {
    const s = buildIssuerSnapshot({ business_name: 'IWC', address_line1: '1 Main', city: 'Beaufort', state: 'SC', postal_code: '29902', payment_instructions: 'Zelle: x' } as any);
    expect(s).toMatchObject({ business_name: 'IWC', city: 'Beaufort', payment_instructions: 'Zelle: x' });
  });
  it('captures bill-to fields from client', () => {
    const b = buildBillToSnapshot({ name: 'Acme', business_name: 'Acme LLC', email: 'a@b.com', address_line1: '2 Oak' } as any);
    expect(b).toMatchObject({ name: 'Acme', business_name: 'Acme LLC', email: 'a@b.com' });
  });
});
```

- [ ] **Step 2: Run, verify FAIL.** `npm test -- snapshot`

- [ ] **Step 3: Implement `src/lib/invoice/snapshot.ts`**

```ts
export function buildIssuerSnapshot(s: Record<string, any>) {
  return {
    business_name: s.business_name, address_line1: s.address_line1, address_line2: s.address_line2,
    city: s.city, state: s.state, postal_code: s.postal_code, country: s.country,
    logo_storage_path: s.logo_storage_path, payment_instructions: s.payment_instructions,
    reply_to: s.reply_to, from_email: s.from_email,
  };
}
export function buildBillToSnapshot(c: Record<string, any>) {
  return {
    name: c.name, business_name: c.business_name, email: c.email, phone: c.phone,
    address_line1: c.address_line1, address_line2: c.address_line2,
    city: c.city, state: c.state, postal_code: c.postal_code, country: c.country,
  };
}
```

- [ ] **Step 4: Run, verify PASS.** `npm test -- snapshot`

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice/snapshot.ts src/lib/invoice/snapshot.test.ts
git commit -m "feat: issuer + bill-to snapshot builders"
```

## Task 2.4: Atomic invoice-number RPC

**Files:** Create `supabase/migrations/0003_invoice_number_rpc.sql`

- [ ] **Step 1: Write the function** — allocates the next number atomically, gap-free, by locking the settings row.

```sql
create or replace function allocate_invoice_number() returns text as $$
declare prefix text; n integer;
begin
  update app_settings
     set next_invoice_number = next_invoice_number + 1
   where id = true
   returning invoice_number_prefix, next_invoice_number - 1 into prefix, n;
  return prefix || n::text;
end;
$$ language plpgsql security definer;
revoke all on function allocate_invoice_number() from anon;
```

- [ ] **Step 2: Apply to DEV.** Test: `select allocate_invoice_number();` twice → consecutive numbers, no gaps.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_invoice_number_rpc.sql
git commit -m "feat(db): atomic gap-free invoice number allocation"
```

## Task 2.5: Invoices data-access module

**Files:** Create `src/lib/db/invoices.ts`, `src/lib/db/payments.ts`

- [ ] **Step 1: `src/lib/db/invoices.ts`** — create draft (+lines), get with lines+client, list, update draft (guarded: only `status='draft'`), recompute persist, send, duplicate, void. Uses `computeTotals`, `applyPayments`, snapshots, and the RPC.

```ts
import type { AstroCookies } from 'astro';
import { getServerClient } from '../supabase/server';
import { getAdminClient } from '../supabase/admin';
import { computeTotals, type TotalsLine } from '../invoice/totals';
import { applyPayments, type InvoiceStatus } from '../invoice/status';
import { buildIssuerSnapshot, buildBillToSnapshot } from '../invoice/snapshot';
import { randomBytes } from 'node:crypto';

export interface DraftLine { service_id?: string|null; description: string; quantity: number; unit_price_cents: number; taxable: boolean; }
export interface DraftInput {
  client_id: string; issue_date: string; due_date: string;
  tax_rate: number; discount_cents: number; terms?: string; notes?: string;
  lines: DraftLine[];
}

function totalsFor(input: { lines: TotalsLine[]; tax_rate: number; discount_cents: number }) {
  return computeTotals({ lines: input.lines, taxRate: input.tax_rate, discountCents: input.discount_cents });
}

export async function createDraft(cookies: AstroCookies, input: DraftInput) {
  const sb = getServerClient(cookies);
  const t = totalsFor({ lines: input.lines, tax_rate: input.tax_rate, discount_cents: input.discount_cents });
  const { data: inv, error } = await sb.from('invoices').insert({
    client_id: input.client_id, status: 'draft',
    issue_date: input.issue_date, due_date: input.due_date,
    tax_rate: input.tax_rate, discount_cents: input.discount_cents,
    subtotal_cents: t.subtotalCents, tax_cents: t.taxCents, total_cents: t.totalCents,
    balance_cents: t.totalCents, terms: input.terms, notes: input.notes,
  }).select().single();
  if (error) throw error;
  await replaceLines(cookies, inv.id, input.lines);
  return inv;
}

export async function replaceLines(cookies: AstroCookies, invoiceId: string, lines: DraftLine[]) {
  const sb = getServerClient(cookies);
  await sb.from('invoice_line_items').delete().eq('invoice_id', invoiceId);
  if (lines.length) {
    const rows = lines.map((l, i) => ({
      invoice_id: invoiceId, service_id: l.service_id ?? null, description: l.description,
      quantity: l.quantity, unit_price_cents: l.unit_price_cents,
      amount_cents: Math.round(l.quantity * l.unit_price_cents), taxable: l.taxable, sort_order: i,
    }));
    const { error } = await sb.from('invoice_line_items').insert(rows);
    if (error) throw error;
  }
}

export async function getInvoice(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('invoices')
    .select('*, client:clients(*), lines:invoice_line_items(*), payments(*)')
    .eq('id', id).single();
  if (error) throw error; return data;
}

export async function listInvoices(cookies: AstroCookies) {
  const sb = getServerClient(cookies);
  const { data, error } = await sb.from('invoices')
    .select('id, invoice_number, status, total_cents, balance_cents, issue_date, due_date, client:clients(name)')
    .order('created_at', { ascending: false });
  if (error) throw error; return data;
}

export async function updateDraft(cookies: AstroCookies, id: string, input: DraftInput) {
  const sb = getServerClient(cookies);
  const current = await getInvoice(cookies, id);
  if (current.status !== 'draft') throw new Error('Only draft invoices can be edited');
  const t = totalsFor({ lines: input.lines, tax_rate: input.tax_rate, discount_cents: input.discount_cents });
  const { error } = await sb.from('invoices').update({
    client_id: input.client_id, issue_date: input.issue_date, due_date: input.due_date,
    tax_rate: input.tax_rate, discount_cents: input.discount_cents,
    subtotal_cents: t.subtotalCents, tax_cents: t.taxCents, total_cents: t.totalCents,
    balance_cents: t.totalCents, terms: input.terms, notes: input.notes,
  }).eq('id', id);
  if (error) throw error;
  await replaceLines(cookies, id, input.lines);
  return getInvoice(cookies, id);
}

export async function sendInvoice(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const inv = await getInvoice(cookies, id);
  if (inv.status !== 'draft') throw new Error('Already sent');
  const { data: settings } = await sb.from('app_settings').select('*').eq('id', true).single();
  const { data: numberRow, error: numErr } = await sb.rpc('allocate_invoice_number');
  if (numErr) throw numErr;
  const token = randomBytes(24).toString('base64url');
  const { error } = await sb.from('invoices').update({
    invoice_number: numberRow, status: 'sent', public_token: token, sent_at: new Date().toISOString(),
    issuer_snapshot: buildIssuerSnapshot(settings), bill_to_snapshot: buildBillToSnapshot(inv.client),
  }).eq('id', id);
  if (error) throw error;
  await logActivity(cookies, 'invoice', id, 'sent', { invoice_number: numberRow });
  // NOTE: actual email send is Phase 3. For now this marks it sent + creates the public link.
  return getInvoice(cookies, id);
}

export async function recordPayment(cookies: AstroCookies, invoiceId: string, p: { amount_cents: number; method: string; reference?: string; note?: string; paid_at?: string; }) {
  const sb = getServerClient(cookies);
  const { error: pErr } = await sb.from('payments').insert({ invoice_id: invoiceId, ...p });
  if (pErr) throw pErr;
  const inv = await getInvoice(cookies, invoiceId);
  const r = applyPayments({ totalCents: inv.total_cents, currentStatus: inv.status as InvoiceStatus }, inv.payments);
  const { error } = await sb.from('invoices').update({
    amount_paid_cents: r.amountPaidCents, balance_cents: r.balanceCents, status: r.status,
    paid_at: r.status === 'paid' ? new Date().toISOString() : null,
  }).eq('id', invoiceId);
  if (error) throw error;
  await logActivity(cookies, 'invoice', invoiceId, 'payment_recorded', { amount_cents: p.amount_cents, method: p.method });
  return getInvoice(cookies, invoiceId);
}

export async function duplicateInvoice(cookies: AstroCookies, id: string) {
  const src = await getInvoice(cookies, id);
  return createDraft(cookies, {
    client_id: src.client_id, issue_date: src.issue_date, due_date: src.due_date,
    tax_rate: src.tax_rate, discount_cents: src.discount_cents, terms: src.terms, notes: src.notes,
    lines: src.lines.map((l: any) => ({ service_id: l.service_id, description: l.description, quantity: l.quantity, unit_price_cents: l.unit_price_cents, taxable: l.taxable })),
  });
}

export async function voidInvoice(cookies: AstroCookies, id: string) {
  const sb = getServerClient(cookies);
  const inv = await getInvoice(cookies, id);
  if (inv.status === 'draft') { await sb.from('invoices').delete().eq('id', id); return { deleted: true }; }
  const { error } = await sb.from('invoices').update({ status: 'void' }).eq('id', id);
  if (error) throw error;
  await logActivity(cookies, 'invoice', id, 'voided', {});
  return { deleted: false };
}

export async function logActivity(cookies: AstroCookies, entity_type: string, entity_id: string, action: string, detail: object) {
  const sb = getServerClient(cookies);
  await sb.from('activity_log').insert({ entity_type, entity_id, action, detail });
}

/** Public read by token — uses the service-role client, returns one invoice only. */
export async function getInvoiceByToken(token: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.from('invoices')
    .select('*, lines:invoice_line_items(*)')
    .eq('public_token', token).single();
  if (error) return null;
  return data;
}

export async function markViewed(token: string) {
  const sb = getAdminClient();
  const { data } = await sb.from('invoices').select('id,status,viewed_at').eq('public_token', token).single();
  if (data && data.status === 'sent' && !data.viewed_at) {
    await sb.from('invoices').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', data.id);
    await sb.from('activity_log').insert({ entity_type: 'invoice', entity_id: data.id, action: 'viewed', detail: {} });
  }
}
```

- [ ] **Step 2: `src/lib/db/payments.ts`** — re-export `recordPayment` for symmetry, plus a `paymentSchema` (zod) used by the API.

```ts
import { z } from 'zod';
export const paymentSchema = z.object({
  amount_cents: z.number().int().positive(),
  method: z.enum(['stripe','check','zelle','cash','other']),
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  paid_at: z.string().optional(),
});
export { recordPayment } from './invoices';
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/invoices.ts src/lib/db/payments.ts
git commit -m "feat: invoice + payment data-access (draft/send/pay/duplicate/void/token)"
```

## Task 2.6: Invoice API routes

**Files:** Create `src/pages/api/admin/invoices/index.ts`, `[id].ts`, `[id]/send.ts`, `[id]/duplicate.ts`, `[id]/void.ts`, `[id]/pdf.ts`, and `src/pages/api/admin/payments/index.ts`

- [ ] **Step 1: `invoices/index.ts`** — POST creates a draft. Body shape matches `DraftInput`; line `unit_price_cents` already converted client-side via `dollarsToCents`, OR convert here from a `unit_price` dollar string. Validate `client_id` present and ≥1 line.

```ts
import type { APIRoute } from 'astro';
import { createDraft } from '../../../../lib/db/invoices';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  if (!raw.client_id) return unprocessable('Client is required');
  if (!Array.isArray(raw.lines) || raw.lines.length === 0) return unprocessable('At least one line item is required');
  try {
    const inv = await createDraft(cookies, {
      client_id: raw.client_id, issue_date: raw.issue_date, due_date: raw.due_date,
      tax_rate: Number(raw.tax_rate ?? 0), discount_cents: Number(raw.discount_cents ?? 0),
      terms: raw.terms, notes: raw.notes,
      lines: raw.lines.map((l: any) => ({
        service_id: l.service_id ?? null, description: String(l.description ?? ''),
        quantity: Number(l.quantity ?? 1), unit_price_cents: Number(l.unit_price_cents ?? 0),
        taxable: !!l.taxable,
      })),
    });
    return json({ invoice: inv }, 201);
  } catch (e) { console.error(e); return serverError(); }
};
```

- [ ] **Step 2: `[id].ts`** — PUT updates a draft (calls `updateDraft`; returns 422 if not draft).
- [ ] **Step 3: `[id]/send.ts`** — POST calls `sendInvoice`.
- [ ] **Step 4: `[id]/duplicate.ts`** — POST calls `duplicateInvoice`, returns new id.
- [ ] **Step 5: `[id]/void.ts`** — POST calls `voidInvoice`.
- [ ] **Step 6: `payments/index.ts`** — POST validates with `paymentSchema` then `recordPayment`.

```ts
import type { APIRoute } from 'astro';
import { paymentSchema, recordPayment } from '../../../../lib/db/payments';
import { badRequest, json, unprocessable, serverError } from '../../../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: any;
  try { raw = await request.json(); } catch { return badRequest('Invalid JSON'); }
  const parsed = paymentSchema.safeParse({ ...raw, amount_cents: Number(raw.amount_cents) });
  if (!parsed.success) return unprocessable(parsed.error.issues[0].message);
  if (!raw.invoice_id) return unprocessable('invoice_id required');
  try { return json({ invoice: await recordPayment(cookies, raw.invoice_id, parsed.data) }, 201); }
  catch (e) { console.error(e); return serverError(); }
};
```

- [ ] **Step 7: `[id]/pdf.ts`** — GET streams/redirects to the cached PDF (built in Task 2.8). Stub now returning 501 until 2.8 lands, then wire to `renderInvoicePdf`.

- [ ] **Step 8: Commit**

```bash
git add src/pages/api/admin/invoices/ src/pages/api/admin/payments/
git commit -m "feat: invoice + payment API routes"
```

## Task 2.7: Invoice UI (list, builder, detail)

**Files:** Create `src/pages/admin/invoices/index.astro`, `new.astro`, `[id].astro`

- [ ] **Step 1: `index.astro`** — list via `listInvoices`; columns: number (or "DRAFT"), client name, status badge, total (`formatUSD`), balance, due date; link to detail; "New invoice" button.

- [ ] **Step 2: `new.astro`** — the builder. Server-load clients (`listClients`) and active services (`listServices`) for pickers. Client-side: a dynamic line-item table where adding a row can pre-fill description/price from a selected service; quantity × unit price live-computes the row amount and running totals using the same math as `computeTotals` (import `formatUSD`, replicate the sum client-side for display only — server is source of truth). On submit, POST to `/api/admin/invoices` with `lines[].unit_price_cents` (converted via `dollarsToCents`) → redirect to `/admin/invoices/{id}`.

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { listClients } from '../../../lib/db/clients';
import { listServices } from '../../../lib/db/services';
const clients = await listClients(Astro.cookies);
const services = await listServices(Astro.cookies);
---
<AdminLayout title="New Invoice">
  <h1 class="text-2xl font-bold">New invoice</h1>
  <form id="inv" class="mt-6 max-w-3xl space-y-4">
    <div class="grid grid-cols-3 gap-3">
      <select name="client_id" required class="rounded border p-2">
        <option value="">Select client…</option>
        {clients.map((c) => <option value={c.id}>{c.name}</option>)}
      </select>
      <input type="date" name="issue_date" required class="rounded border p-2" />
      <input type="date" name="due_date" required class="rounded border p-2" />
    </div>

    <table class="w-full text-sm" id="lines">
      <thead><tr class="text-left text-slate-500"><th>Description</th><th>Qty</th><th>Unit $</th><th>Tax</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
    <div class="flex gap-2">
      <button type="button" id="addLine" class="rounded bg-slate-200 px-3 py-1 text-sm">+ Line</button>
      <select id="presetPicker" class="rounded border p-1 text-sm">
        <option value="">Add from preset…</option>
        {services.map((s) => <option value={s.id} data-desc={s.name} data-price={(s.default_unit_price_cents/100).toFixed(2)} data-tax={String(s.taxable)}>{s.name}</option>)}
      </select>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <input name="tax_rate" type="number" step="0.001" placeholder="Tax rate (e.g. 0.07)" class="rounded border p-2" />
      <input name="discount" type="text" placeholder="Discount $" class="rounded border p-2" />
      <div class="text-right font-semibold" id="totalPreview">Total: $0.00</div>
    </div>
    <textarea name="notes" placeholder="Notes / terms" class="w-full rounded border p-2"></textarea>
    <p id="err" class="hidden text-sm text-red-600"></p>
    <button class="rounded bg-blue-700 px-4 py-2 font-semibold text-white">Save draft</button>
  </form>

  <script>
    import { dollarsToCents, formatUSD } from '/src/lib/money.ts';
    // NOTE: in Astro, client scripts can't import server TS via absolute path at runtime;
    // inline minimal copies of dollarsToCents/formatUSD here to keep the bundle self-contained.
  </script>
</AdminLayout>
```

> Implementation note for the worker: Astro client `<script>` is bundled — import the money helpers normally (`import { dollarsToCents, formatUSD } from '../../../lib/money';`) since they are pure and tree-shakeable, OR inline tiny copies. Do NOT import any `lib/db/*` or `lib/supabase/*` into a client script (they pull server secrets). The line-row JS: each row has description input, qty input, unit-$ input, taxable checkbox, remove button; recompute the preview total on input; on submit build `lines` with `unit_price_cents = dollarsToCents(unitField.value)` and `discount_cents = dollarsToCents(discountField.value)`.

- [ ] **Step 3: `[id].astro`** — detail view. Server-load via `getInvoice`. Shows: status badge, number/DRAFT, client, line items, totals, balance, public link (if sent), payments list. Actions:
  - If `draft`: "Edit" (links to an edit mode reusing the builder pre-filled — simplest: render the same builder bound to PUT), "Send" (POST send), "Delete/Void".
  - If sent/viewed/partial/overdue: "Record payment" (opens a small form → POST `/api/admin/payments`), "Download PDF", "Duplicate", "Void", show the `/i/{token}` link.
  - If paid: read-only summary + "Duplicate".

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { getInvoice } from '../../../lib/db/invoices';
import { formatUSD } from '../../../lib/money';
const inv = await getInvoice(Astro.cookies, Astro.params.id!);
const base = Astro.url.origin;
---
<AdminLayout title={inv.invoice_number ?? 'Draft invoice'}>
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">{inv.invoice_number ?? 'DRAFT'} · {inv.client.name}</h1>
    <span class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase">{inv.status}</span>
  </div>

  <table class="mt-6 w-full text-sm">
    <thead><tr class="text-left text-slate-500"><th>Description</th><th>Qty</th><th>Unit</th><th class="text-right">Amount</th></tr></thead>
    <tbody>
      {inv.lines.sort((a,b)=>a.sort_order-b.sort_order).map((l) => (
        <tr class="border-t"><td>{l.description}</td><td>{l.quantity}</td><td>{formatUSD(l.unit_price_cents)}</td><td class="text-right">{formatUSD(l.amount_cents)}</td></tr>
      ))}
    </tbody>
  </table>
  <div class="mt-4 text-right text-sm">
    <div>Subtotal: {formatUSD(inv.subtotal_cents)}</div>
    <div>Discount: −{formatUSD(inv.discount_cents)}</div>
    <div>Tax: {formatUSD(inv.tax_cents)}</div>
    <div class="text-lg font-bold">Total: {formatUSD(inv.total_cents)}</div>
    <div>Balance: {formatUSD(inv.balance_cents)}</div>
  </div>

  {inv.public_token && (
    <p class="mt-4 text-sm">Public link: <a class="text-blue-700" href={`/i/${inv.public_token}`}>{base}/i/{inv.public_token}</a></p>
  )}

  <div class="mt-6 flex flex-wrap gap-2" data-id={inv.id} data-status={inv.status}>
    {inv.status === 'draft' && <button id="send" class="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white">Send</button>}
    {inv.status !== 'draft' && inv.status !== 'paid' && inv.status !== 'void' && <button id="pay" class="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record payment</button>}
    {inv.status !== 'draft' && <a href={`/api/admin/invoices/${inv.id}/pdf`} class="rounded bg-slate-200 px-4 py-2 text-sm">Download PDF</a>}
    <button id="dup" class="rounded bg-slate-200 px-4 py-2 text-sm">Duplicate</button>
    <button id="void" class="rounded bg-red-100 px-4 py-2 text-sm text-red-700">{inv.status === 'draft' ? 'Delete' : 'Void'}</button>
  </div>

  <section class="mt-8">
    <h2 class="font-semibold">Payments</h2>
    <ul class="mt-2 text-sm">
      {inv.payments.map((p) => <li>{formatUSD(p.amount_cents)} · {p.method} · {new Date(p.paid_at).toLocaleDateString()} {p.reference ? `· ${p.reference}`:''}</li>)}
    </ul>
  </section>

  <script>
    const wrap = document.querySelector('[data-id]') as HTMLElement;
    const id = wrap.dataset.id!;
    document.getElementById('send')?.addEventListener('click', async () => {
      if (!confirm('Send invoice? This locks it and assigns a number.')) return;
      const r = await fetch(`/api/admin/invoices/${id}/send`, { method: 'POST' });
      if (r.ok) location.reload(); else alert((await r.json()).error);
    });
    document.getElementById('dup')?.addEventListener('click', async () => {
      const r = await fetch(`/api/admin/invoices/${id}/duplicate`, { method: 'POST' });
      const j = await r.json(); if (r.ok) location.href = `/admin/invoices/${j.invoice.id}`;
    });
    document.getElementById('void')?.addEventListener('click', async () => {
      if (!confirm('Are you sure?')) return;
      const r = await fetch(`/api/admin/invoices/${id}/void`, { method: 'POST' });
      if (r.ok) location.href = '/admin/invoices';
    });
    document.getElementById('pay')?.addEventListener('click', async () => {
      const amt = prompt('Amount paid (USD):'); if (!amt) return;
      const method = prompt('Method (check/zelle/cash/other):', 'check') ?? 'other';
      const [w, f=''] = amt.replace(/,/g,'').split('.');
      const amount_cents = Number(w)*100 + Number(f.padEnd(2,'0').slice(0,2));
      const r = await fetch('/api/admin/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: id, amount_cents, method }),
      });
      if (r.ok) location.reload(); else alert((await r.json()).error);
    });
  </script>
</AdminLayout>
```

- [ ] **Step 4: Wire the client detail page** (`src/pages/admin/clients/[id].astro`) Invoices placeholder section to list that client's invoices (query invoices by `client_id`). Replace the Phase-1 placeholder.

- [ ] **Step 5: Manual verify (preview).** Create draft (client + 2 lines incl. a preset) → totals correct → Send → number assigned, status `sent`, public link shown → Record partial payment → status `partial`, balance drops → Record remainder → status `paid`. Duplicate → new draft. Void a sent invoice → status `void`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/invoices/ src/pages/admin/clients/[id].astro
git commit -m "feat: invoice UI (list, builder, detail, payments)"
```

## Task 2.8: PDF generation spike + caching

**Files:** Create `src/lib/invoice/pdf.ts`; wire `src/pages/api/admin/invoices/[id]/pdf.ts`

**This is the flagged technical risk (spec §9). Timebox the spike: get one PDF rendering on Vercel before polishing.**

- [ ] **Step 1: Install serverless Chromium**

Run:
```bash
npm install puppeteer-core @sparticuz/chromium
```

- [ ] **Step 2: Implement `src/lib/invoice/pdf.ts`** — render the invoice HTML (shared template) to PDF, cache to the `invoice-pdfs` bucket, return a signed URL. Use the snapshot data so the PDF reflects send-time details.

```ts
import { getAdminClient } from '../supabase/admin';
import { formatUSD } from '../money';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export function invoiceHtml(inv: any): string {
  const issuer = inv.issuer_snapshot ?? {};
  const bill = inv.bill_to_snapshot ?? {};
  const rows = (inv.lines ?? []).map((l: any) =>
    `<tr><td>${l.description}</td><td>${l.quantity}</td><td>${formatUSD(l.unit_price_cents)}</td><td style="text-align:right">${formatUSD(l.amount_cents)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;color:#0f172a;padding:40px}
    h1{font-size:20px} table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:13px}
    .tot{text-align:right;margin-top:16px}</style></head><body>
    <h1>${issuer.business_name ?? 'Integrity Web Creations'}</h1>
    <p>Invoice ${inv.invoice_number ?? ''} · ${inv.issue_date ?? ''}</p>
    <p><strong>Bill to:</strong> ${bill.name ?? ''} ${bill.business_name ? '· '+bill.business_name : ''}</p>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">Subtotal: ${formatUSD(inv.subtotal_cents)}<br/>Discount: −${formatUSD(inv.discount_cents)}<br/>Tax: ${formatUSD(inv.tax_cents)}<br/><strong>Total: ${formatUSD(inv.total_cents)}</strong></div>
    <p style="margin-top:24px;font-size:12px;color:#475569">${issuer.payment_instructions ?? ''}</p>
  </body></html>`;
}

export async function renderInvoicePdf(invoiceId: string): Promise<string> {
  const sb = getAdminClient();
  const { data: inv, error } = await sb.from('invoices')
    .select('*, lines:invoice_line_items(*)').eq('id', invoiceId).single();
  if (error || !inv) throw new Error('Invoice not found');

  const browser = await puppeteer.launch({
    args: chromium.args, executablePath: await chromium.executablePath(), headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(invoiceHtml(inv), { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'letter', printBackground: true });
  await browser.close();

  const path = `${invoiceId}.pdf`;
  await sb.storage.from('invoice-pdfs').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  await sb.from('invoices').update({ pdf_storage_path: path }).eq('id', invoiceId);
  const { data: signed } = await sb.storage.from('invoice-pdfs').createSignedUrl(path, 60 * 10);
  return signed!.signedUrl;
}
```

- [ ] **Step 3: Wire `[id]/pdf.ts`** to redirect to the signed URL.

```ts
import type { APIRoute } from 'astro';
import { renderInvoicePdf } from '../../../../../lib/invoice/pdf';
import { serverError } from '../../../../../lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try { return Response.redirect(await renderInvoicePdf(params.id!), 302); }
  catch (e) { console.error(e); return serverError('PDF generation failed'); }
};
```

- [ ] **Step 4: Configure Vercel function** for the larger Chromium binary. Add to `astro.config.mjs` Vercel adapter options (or `vercel.json` functions) increased memory/maxDuration for the PDF route. Document the exact setting after the spike confirms cold-start size.

- [ ] **Step 5: Verify (deploy preview).** Because `@sparticuz/chromium` only runs in the Vercel/Linux runtime (not reliably on local Windows), push the branch to a Vercel **preview deployment** and test "Download PDF" there. If cold start/size fails, fall back: (a) `@sparticuz/chromium-min` + remote brotli, or (b) a hosted HTML→PDF API. Record the chosen path in the spec §9.

- [ ] **Step 6: Commit**

```bash
git add src/lib/invoice/pdf.ts src/pages/api/admin/invoices/[id]/pdf.ts astro.config.mjs
git commit -m "feat: invoice PDF rendering + caching (serverless chromium spike)"
```

## Task 2.9: Public hosted invoice page `/i/[token]`

**Files:** Create `src/pages/i/[token].astro`

- [ ] **Step 1: Implement** — server-load via `getInvoiceByToken` (service role, single invoice), call `markViewed`, render a branded read-only view (line items, totals, payment instructions, "Download PDF" link to a token-scoped PDF). **No Pay Now button yet** (Phase 3). Return 404 for unknown/void tokens. Add `<meta name="robots" content="noindex">`.

```astro
---
export const prerender = false;
import { getInvoiceByToken, markViewed } from '../../lib/db/invoices';
import { formatUSD } from '../../lib/money';
const token = Astro.params.token!;
const inv = await getInvoiceByToken(token);
if (!inv || inv.status === 'void') return new Response('Not found', { status: 404 });
await markViewed(token);
const issuer = inv.issuer_snapshot ?? {};
const bill = inv.bill_to_snapshot ?? {};
---
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Invoice {inv.invoice_number}</title></head>
<body style="font-family:Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#0f172a">
  <h1>{issuer.business_name}</h1>
  <p>Invoice <strong>{inv.invoice_number}</strong> · Issued {inv.issue_date} · Due {inv.due_date}</p>
  <p><strong>Bill to:</strong> {bill.name}{bill.business_name ? ` · ${bill.business_name}` : ''}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <thead><tr><th align="left">Description</th><th>Qty</th><th>Unit</th><th align="right">Amount</th></tr></thead>
    <tbody>
      {inv.lines.sort((a,b)=>a.sort_order-b.sort_order).map((l) => (
        <tr><td>{l.description}</td><td align="center">{l.quantity}</td><td align="center">{formatUSD(l.unit_price_cents)}</td><td align="right">{formatUSD(l.amount_cents)}</td></tr>
      ))}
    </tbody>
  </table>
  <p style="text-align:right;margin-top:16px;font-size:18px"><strong>Total due: {formatUSD(inv.balance_cents)}</strong></p>
  <p style="color:#475569;font-size:13px">{issuer.payment_instructions}</p>
  <p><a href={`/i/${token}/pdf`}>Download PDF</a></p>
</body></html>
```

- [ ] **Step 2: Add token-scoped PDF route** `src/pages/i/[token]/pdf.ts` that looks up the invoice id by token (service role) then `renderInvoicePdf`. (Keeps the public path from exposing the admin API.)

- [ ] **Step 3: Manual verify (preview deployment).** Open a sent invoice's `/i/{token}` in a private window → renders, and the admin invoice flips to `viewed` (and owner alert will fire in Phase 3). Unknown token → 404.

- [ ] **Step 4: Commit**

```bash
git add src/pages/i/
git commit -m "feat: public hosted invoice page + token PDF"
```

---

## ✅ GATE 2 — First usable milestone

- [ ] `npm test` passes (money, http, validation, totals, status, snapshot).
- [ ] `npm run build` succeeds; Vercel preview deploy is green.
- [ ] End-to-end: new client → new invoice (preset + custom line) → correct totals → send (gap-free number, snapshots stored) → public page renders + marks viewed → record partial then final payment → status `paid`, balance `$0.00`.
- [ ] PDF downloads on the Vercel preview (or fallback path chosen + noted in spec §9).
- [ ] Duplicate + void behave correctly; drafts delete, sent invoices void (number retained).
- [ ] Security spot-check: anon hitting `/api/admin/*` → redirect/401; service-role key absent from client bundles; `/i/*` is `noindex`.

**Human review checkpoint.** After approval, proceed to Phase 3 (Postmark email + Stripe Pay-Now) — a separate plan.

---

## Self-Review Notes (planner)

- **Spec coverage:** Phase 0 covers spec §3, §4 (full schema), §8 (auth/RLS/2FA/CSP/noindex). Phase 1 covers §6 records + §4 services/settings + templates-as-presets. Phase 2 covers §5.1 invoice lifecycle (create/send/pay/duplicate/void), send-time numbering, immutability (draft-only edit guard), snapshotting, §7 hosted page, §9 PDF spike. Out-of-phase items (Stripe, Postmark, recurring cron, reports) are correctly deferred to Phases 3–5.
- **Deferred-but-noted:** owner alerts + email send live in Phase 3; the `send` flow currently marks sent + creates the link without emailing — explicitly stated in code comments.
- **Type consistency:** `default_unit_price_cents`, `unit_price_cents`, `amount_cents`, `total_cents`, `balance_cents`, `status` enum, and the `applyPayments`/`computeTotals` signatures are used consistently across modules, APIs, and UI.
- **Known platform caveat:** `@sparticuz/chromium` needs the Linux/Vercel runtime; the plan routes PDF verification through a preview deploy rather than local Windows, with documented fallbacks.
