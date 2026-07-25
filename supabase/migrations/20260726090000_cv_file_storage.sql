-- IMPLEMENTATION_ORDER_V2.md Phase 40 (UX Refinement & Workflow
-- Simplification), "CV LIBRARY": CV versions now hold a real uploaded PDF.
-- All four columns are nullable - existing CV versions created before this
-- phase have no file yet, and remain fully valid (DATABASE.md's own
-- (user_id, name) uniqueness and every existing FK/relationship are
-- untouched). No column is required at the database level; CVVersionService
-- enforces "a new CV version must have a file" as a business rule instead
-- (ARCHITECTURE.md "Business Rule Ownership").
alter table public.cv_versions
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists uploaded_at timestamptz;

-- DEPLOYMENT.md previously stated "The MVP does not require file uploads.
-- Supabase Storage should not be configured" - superseded by this phase's
-- own explicit, user-approved decision to implement real file storage for
-- the CV Library (see DEPLOYMENT.md's updated "File Storage" section).
-- Private bucket (public = false): every read goes through a signed URL
-- minted server-side after the caller's ownership is verified, the same
-- "never trust the client, verify ownership" rule ARCHITECTURE.md
-- "Authorization" already requires everywhere else.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cv-files', 'cv-files', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- Object keys are always "<user_id>/<cv_version_id>.pdf" (CVVersionRepository
-- builds this path, never the client) - storage.foldername(name)[1] is that
-- leading <user_id> segment, so this is the exact same
-- "user_id = (select auth.uid())" ownership check every other RLS policy in
-- this project already uses, just expressed against storage.objects instead
-- of a public table.
drop policy if exists "Users can manage own CV files" on storage.objects;
create policy "Users can manage own CV files"
  on storage.objects for all
  using (
    bucket_id = 'cv-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'cv-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
