-- Heritage Vault — storage bucket + policies

-- ─────────────────────────────────────────────
-- Create the private vault-media bucket
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vault-media',
  'vault-media',
  false,
  2147483648,  -- 2 GB (Deepgram limit)
  array[
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg',
    'video/webm', 'video/mp4'
  ]
)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- Storage RLS (defense-in-depth)
--
-- All playback and upload already use signed URLs which bypass storage RLS.
-- These policies protect against any direct access attempt.
-- Path format: {vault_id}/{person_id}/{timestamp}.{ext}
-- ─────────────────────────────────────────────

-- Vault members can read files in their vault
create policy "vault_members_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vault-media'
    and is_vault_member(split_part(name, '/', 1)::uuid)
  );

-- Vault members can insert files into their vault (signed URL handles auth,
-- but this covers any direct upload edge-cases)
create policy "vault_members_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vault-media'
    and is_vault_member(split_part(name, '/', 1)::uuid)
  );

-- Vault admins can delete files
create policy "vault_admins_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vault-media'
    and is_vault_admin(split_part(name, '/', 1)::uuid)
  );
