#!/usr/bin/env node
// Gate G2 + G4 (FindersKeepers/docs/05-GUARDRAILS.md): proposal data is unreadable without the server,
// and signed records can't be changed. Runs against the REAL project. Exits 1 on any failure.
//
//   node --env-file=<path to pulled env> scripts/test-rls-proposals.mjs
//
// Needs SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. The service role is used ONLY for the
// positive control (prove the canary exists) and the trigger checks; every leak check uses the anon key.

// Public values (safe to hard-code: the anon key is shipped to browsers). Env overrides them.
const URL_ = process.env.SUPABASE_URL || 'https://oumrxmzstbcukvtylmcc.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bXJ4bXpzdGJjdWt2dHlsbWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTMyMDMsImV4cCI6MjA5NTUyOTIwM30.xqXquGeq9S8M-lJftzDawju5AjzHKUX0HmPjD56rQ5A';
// Secret: Vercel marks it Sensitive (pulls as empty), so supply it locally from the Supabase dashboard
// (Settings > API) via a file OUTSIDE the repo. Without it the privileged half is NOT RUN and the gate fails,
// unless ALLOW_PARTIAL=1 (then the privileged checks must be run as SQL: supabase/tests/proposals_frozen.sql).
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PARTIAL_OK = process.env.ALLOW_PARTIAL === '1';

const TABLES = ['proposals', 'proposal_selections', 'proposal_signatures', 'proposal_events'];
const CANARY_OBJECT = 'canary/canary.txt';
let failures = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': 'crm', 'Content-Profile': 'crm',
           'Content-Type': 'application/json', ...extra };
}
async function rest(key, path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: headers(key, init.headers) });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { status: res.status, body };
}

async function main() {
  // ── Positive control: the canary is really there ─────────────────────────────
  // Without the service key we still attack with a placeholder id: denial must not depend on the id.
  let canaryId = '00000000-0000-4000-8000-000000000000';
  if (SERVICE) {
    console.log('Positive control (service role)');
    const { body: cp } = await rest(SERVICE, 'proposals?config_slug=eq.canary&select=id');
    canaryId = Array.isArray(cp) && cp[0]?.id;
    if (!canaryId) { fail('canary proposal not found; run supabase/seed/proposals_seed.sql'); return; }
    pass(`canary proposal ${canaryId.slice(0, 8)}`);
    const key = (t) => (t === 'proposals' ? 'id' : 'proposal_id');
    for (const t of TABLES) {
      const r = await rest(SERVICE, `${t}?${key(t)}=eq.${canaryId}&select=*`);
      Array.isArray(r.body) && r.body.length > 0 ? pass(`service role reads ${t}`) : fail(`service role cannot read ${t} (${r.status})`);
    }
    const up = await fetch(`${URL_}/storage/v1/object/proposals/${CANARY_OBJECT}`, {
      method: 'POST',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'text/plain', 'x-upsert': 'true' },
      body: 'canary',
    });
    up.ok ? pass('canary storage object present') : fail(`canary upload failed (${up.status})`);
  } else {
    console.log('Positive control: NOT RUN (no SUPABASE_SERVICE_ROLE_KEY)');
    if (!PARTIAL_OK) fail('privileged half not run (set the key, or ALLOW_PARTIAL=1 and run supabase/tests/proposals_frozen.sql)');
  }

  // ── Anon key: must see nothing, write nothing ───────────────────────────────
  console.log('Anon key (must be denied)');
  for (const t of TABLES) {
    const r = await rest(ANON, `${t}?select=*`);
    const leaked = Array.isArray(r.body) && r.body.length > 0;
    leaked ? fail(`anon READ ${t}: ${r.body.length} row(s) leaked`) : pass(`anon read ${t} denied (${r.status})`);
  }
  const ins = await rest(ANON, 'proposal_events', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ proposal_id: canaryId, event: 'viewed', meta: { attack: true } }),
  });
  ins.status >= 200 && ins.status < 300 ? fail(`anon INSERT proposal_events succeeded (${ins.status})`) : pass(`anon insert denied (${ins.status})`);
  const upd = await rest(ANON, `proposals?id=eq.${canaryId}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'fully_signed' }),
  });
  const updated = upd.status < 300 && Array.isArray(upd.body) && upd.body.length > 0;
  updated ? fail('anon UPDATE proposals succeeded') : pass(`anon update denied (${upd.status})`);
  const dl = await fetch(`${URL_}/storage/v1/object/proposals/${CANARY_OBJECT}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  dl.ok ? fail('anon DOWNLOADED from private proposals bucket') : pass(`anon storage download denied (${dl.status})`);
  const pub = await fetch(`${URL_}/storage/v1/object/public/proposals/${CANARY_OBJECT}`);
  pub.ok ? fail('proposals bucket served a PUBLIC url') : pass(`public url denied (${pub.status})`);

  // ── Frozen-record triggers (service role bypasses RLS, triggers still apply) ──
  if (!SERVICE) { console.log('Frozen records: NOT RUN here (see supabase/tests/proposals_frozen.sql)'); return; }
  console.log('Frozen records (service role, triggers must refuse)');
  const fz = await rest(SERVICE, `proposals?id=eq.${canaryId}`, {
    method: 'PATCH', body: JSON.stringify({ agreement_html: '<p>TAMPERED</p>' }),
  });
  String(fz.body?.message ?? '').includes('agreement is frozen')
    ? pass('frozen agreement edit refused') : fail(`frozen agreement edit NOT refused (${fz.status})`);
  const sg = await rest(SERVICE, `proposal_signatures?proposal_id=eq.${canaryId}`, {
    method: 'PATCH', body: JSON.stringify({ signer_name: 'Tampered' }),
  });
  String(sg.body?.message ?? '').includes('append-only')
    ? pass('signature edit refused') : fail(`signature edit NOT refused (${sg.status})`);
  const sd = await rest(SERVICE, `proposal_signatures?proposal_id=eq.${canaryId}`, { method: 'DELETE' });
  String(sd.body?.message ?? '').includes('append-only')
    ? pass('signature delete refused') : fail(`signature delete NOT refused (${sd.status})`);
}

main()
  .catch((e) => { fail(`crashed: ${e?.message ?? e}`); })
  .finally(() => {
    console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll RLS / frozen-record checks passed');
    process.exit(failures ? 1 : 0);
  });
