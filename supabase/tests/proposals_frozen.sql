-- Privileged half of the proposals gate (pairs with scripts/test-rls-proposals.mjs).
-- Run in the SQL editor or via Supabase MCP. Raises an exception (fails) on any problem; returns 'PASS' otherwise.
-- Changes nothing: every write it attempts must be refused.
do $$
declare
  v_id uuid;
  v_ok boolean;
  t text;
begin
  -- Positive control: canary exists in every table.
  select id into v_id from crm.proposals where config_slug = 'canary';
  if v_id is null then raise exception 'FAIL: canary proposal missing (run supabase/seed/proposals_seed.sql)'; end if;
  if not exists (select 1 from crm.proposal_selections where proposal_id = v_id) then raise exception 'FAIL: canary selection missing'; end if;
  if not exists (select 1 from crm.proposal_signatures where proposal_id = v_id) then raise exception 'FAIL: canary signature missing'; end if;
  if not exists (select 1 from crm.proposal_events where proposal_id = v_id) then raise exception 'FAIL: canary event missing'; end if;

  -- RLS on, anon has no privileges, bucket private.
  foreach t in array array['proposals','proposal_selections','proposal_signatures','proposal_events'] loop
    if not (select relrowsecurity from pg_class where oid = format('crm.%I', t)::regclass) then
      raise exception 'FAIL: RLS off on crm.%', t;
    end if;
    if has_table_privilege('anon', format('crm.%I', t), 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'FAIL: anon has a privilege on crm.%', t;
    end if;
  end loop;
  if has_schema_privilege('anon', 'crm', 'USAGE') then raise exception 'FAIL: anon can use schema crm'; end if;
  if (select public from storage.buckets where id = 'proposals') is distinct from false then
    raise exception 'FAIL: proposals bucket missing or public';
  end if;

  -- Frozen agreement cannot change.
  v_ok := false;
  begin
    update crm.proposals set agreement_html = '<p>TAMPERED</p>' where id = v_id;
  exception when others then v_ok := sqlerrm like '%agreement is frozen%';
  end;
  if not v_ok then raise exception 'FAIL: frozen agreement edit was not refused'; end if;

  -- Signatures are append-only.
  v_ok := false;
  begin
    update crm.proposal_signatures set signer_name = 'Tampered' where proposal_id = v_id;
  exception when others then v_ok := sqlerrm like '%append-only%';
  end;
  if not v_ok then raise exception 'FAIL: signature edit was not refused'; end if;

  v_ok := false;
  begin
    delete from crm.proposal_signatures where proposal_id = v_id;
  exception when others then v_ok := sqlerrm like '%append-only%';
  end;
  if not v_ok then raise exception 'FAIL: signature delete was not refused'; end if;

  -- Consent must be true (DB check).
  v_ok := false;
  begin
    insert into crm.proposal_signatures (proposal_id, party, signer_name, consent_electronic, consent_terms, agreement_sha256)
    values (v_id, 'iwc', 'No Consent', false, true, repeat('a', 64));
  exception when others then v_ok := sqlerrm like '%check constraint%';
  end;
  if not v_ok then raise exception 'FAIL: signature without consent was not refused'; end if;

  -- Store without support is structurally impossible.
  v_ok := false;
  begin
    update crm.proposal_selections set website_route = 'files_only' where proposal_id = v_id;
  exception when others then v_ok := sqlerrm like '%selections_store_needs_support%';
  end;
  if not v_ok then raise exception 'FAIL: store on files-only was not refused'; end if;
end $$;
select 'PASS' as proposals_frozen;
