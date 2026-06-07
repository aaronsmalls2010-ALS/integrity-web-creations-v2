-- Private storage buckets for branding (logo) + invoice PDFs.
-- Applied via Supabase MCP migration `crm_storage_buckets`.
insert into storage.buckets (id, name, public) values ('branding','branding', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('invoice-pdfs','invoice-pdfs', false)
  on conflict (id) do nothing;

-- Admin-only access (anon/public get nothing); service_role bypasses RLS for PDF generation.
drop policy if exists "admin branding" on storage.objects;
create policy "admin branding" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists "admin pdfs" on storage.objects;
create policy "admin pdfs" on storage.objects for all to authenticated
  using (bucket_id = 'invoice-pdfs' and public.is_admin())
  with check (bucket_id = 'invoice-pdfs' and public.is_admin());
