-- Cross-vault denial suite.
--
-- Runs with `supabase test db` locally and in CI on every push, from Sprint 1
-- to Sprint 11. It builds its own two vaults rather than relying on seed.sql,
-- so editing the demo family can never silently weaken it.
--
--   Vault A (aaaaaaaa-…)  alice = admin, amy = member
--   Vault B (bbbbbbbb-…)  bob   = admin
--
-- Every one of the 13 tables gets a row in vault A. Bob must see none of them,
-- and Alice must see all of them, so a denial can never pass just because the
-- table happened to be empty.
--
-- ID scheme: <vault>-0000-0000-<table>-<n>
--   0001 people  0002 family_units  0003 vault_members  0004 recording_requests
--   0005 contributor_tokens  0006 media_assets  0008 tags  0009 audit_log

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(49);

-- ─────────────────────────────────────────────
-- Fixture (as postgres, the table owner, so RLS does not apply)
-- ─────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role) VALUES
  ('a1a1a1a1-0000-0000-0000-000000000000', 'alice@test.local', 'authenticated', 'authenticated'),
  ('a2a2a2a2-0000-0000-0000-000000000000', 'amy@test.local',   'authenticated', 'authenticated'),
  ('b1b1b1b1-0000-0000-0000-000000000000', 'bob@test.local',   'authenticated', 'authenticated');

INSERT INTO vaults (id, name, slug) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Vault A', 'test-vault-a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Vault B', 'test-vault-b');

INSERT INTO people (id, vault_id, given_name, tier) VALUES
  ('aaaaaaaa-0000-0000-0001-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Alice',   'member'),
  ('aaaaaaaa-0000-0000-0001-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Amy',     'member'),
  ('aaaaaaaa-0000-0000-0001-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'Grandpa', 'light_contributor'),
  ('bbbbbbbb-0000-0000-0001-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 'Bob',     'member');

INSERT INTO vault_members (id, vault_id, user_id, person_id, role) VALUES
  ('aaaaaaaa-0000-0000-0003-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   'a1a1a1a1-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0001-000000000001', 'admin'),
  ('aaaaaaaa-0000-0000-0003-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
   'a2a2a2a2-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0001-000000000002', 'member'),
  ('bbbbbbbb-0000-0000-0003-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000',
   'b1b1b1b1-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0001-000000000001', 'admin');

INSERT INTO family_units (id, vault_id) VALUES
  ('aaaaaaaa-0000-0000-0002-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO family_partners (family_unit_id, person_id) VALUES
  ('aaaaaaaa-0000-0000-0002-000000000001', 'aaaaaaaa-0000-0000-0001-000000000003');
INSERT INTO family_children (family_unit_id, person_id, adopted) VALUES
  ('aaaaaaaa-0000-0000-0002-000000000001', 'aaaaaaaa-0000-0000-0001-000000000001', true);

INSERT INTO recording_requests (id, vault_id, requester_id, subject_person_id, subject, medium) VALUES
  ('aaaaaaaa-0000-0000-0004-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   'aaaaaaaa-0000-0000-0003-000000000001', 'aaaaaaaa-0000-0000-0001-000000000003',
   'The farm', 'video');

INSERT INTO contributor_tokens (id, token_hash, person_id, vault_id, request_id, expires_at) VALUES
  ('aaaaaaaa-0000-0000-0005-000000000001', repeat('ab', 32),
   'aaaaaaaa-0000-0000-0001-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000',
   'aaaaaaaa-0000-0000-0004-000000000001', now() + interval '1 day');

-- One family-visible recording and one admin-only recording, same secret word.
INSERT INTO media_assets (id, vault_id, person_id, storage_path, mime_type, privacy) VALUES
  ('aaaaaaaa-0000-0000-0006-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   'aaaaaaaa-0000-0000-0001-000000000003', 'a/family.mp4', 'video/mp4', 'family'),
  ('aaaaaaaa-0000-0000-0006-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
   'aaaaaaaa-0000-0000-0001-000000000003', 'a/admin.mp4', 'video/mp4', 'admin');
INSERT INTO transcripts (media_asset_id, provider, full_text) VALUES
  ('aaaaaaaa-0000-0000-0006-000000000001', 'fake', 'The zanzibar story, family version.'),
  ('aaaaaaaa-0000-0000-0006-000000000002', 'fake', 'The zanzibar story, admin version.');

INSERT INTO tags (id, vault_id, name) VALUES
  ('aaaaaaaa-0000-0000-0008-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'secret');
INSERT INTO media_tags (media_asset_id, tag_id) VALUES
  ('aaaaaaaa-0000-0000-0006-000000000001', 'aaaaaaaa-0000-0000-0008-000000000001'),
  ('aaaaaaaa-0000-0000-0006-000000000002', 'aaaaaaaa-0000-0000-0008-000000000001');

INSERT INTO audit_log (id, vault_id, actor_type, action) VALUES
  ('aaaaaaaa-0000-0000-0009-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'system', 'test');

-- Vault A rows per table, as seen by the current role.
CREATE FUNCTION pg_temp.vault_a_rows()
RETURNS TABLE (tbl TEXT, n BIGINT) LANGUAGE sql AS $$
  SELECT 'vaults',             count(*) FROM public.vaults             WHERE id       = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'people',             count(*) FROM public.people             WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'vault_members',      count(*) FROM public.vault_members      WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'family_units',       count(*) FROM public.family_units       WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'family_partners',    count(*) FROM public.family_partners    WHERE family_unit_id = 'aaaaaaaa-0000-0000-0002-000000000001' UNION ALL
  SELECT 'family_children',    count(*) FROM public.family_children    WHERE family_unit_id = 'aaaaaaaa-0000-0000-0002-000000000001' UNION ALL
  SELECT 'recording_requests', count(*) FROM public.recording_requests WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'contributor_tokens', count(*) FROM public.contributor_tokens WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'media_assets',       count(*) FROM public.media_assets       WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'transcripts',        count(*) FROM public.transcripts        WHERE media_asset_id::text LIKE 'aaaaaaaa-%' UNION ALL
  SELECT 'tags',               count(*) FROM public.tags               WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' UNION ALL
  SELECT 'media_tags',         count(*) FROM public.media_tags         WHERE media_asset_id::text LIKE 'aaaaaaaa-%' UNION ALL
  SELECT 'audit_log',          count(*) FROM public.audit_log          WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000'
$$;
GRANT EXECUTE ON FUNCTION pg_temp.vault_a_rows() TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 1. Structure: RLS on every public table, no exceptions
-- ─────────────────────────────────────────────
SELECT is(
  (SELECT array_agg(tablename::text ORDER BY tablename) FROM pg_tables
    WHERE schemaname = 'public' AND NOT rowsecurity),
  NULL,
  'every table in public has row level security enabled'
);

SELECT is(
  (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public'),
  13,
  'public has exactly the 13 known tables (a new table must be added to this suite)'
);

-- ─────────────────────────────────────────────
-- 2. Bob (admin of vault B) sees nothing of vault A, table by table
-- ─────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"b1b1b1b1-0000-0000-0000-000000000000","role":"authenticated"}', true);

SELECT is(n, 0::bigint, format('outsider sees no vault A rows in %s', tbl))
  FROM pg_temp.vault_a_rows();

SELECT is(
  (SELECT count(*)::int FROM public.search_transcripts('aaaaaaaa-0000-0000-0000-000000000000', 'zanzibar')),
  0,
  'outsider cannot search vault A transcripts'
);

SELECT throws_ok(
  $$ INSERT INTO public.people (vault_id, given_name) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'Intruder') $$,
  '42501', NULL,
  'outsider cannot add a person to vault A'
);

SELECT throws_ok(
  $$ INSERT INTO public.recording_requests (vault_id, requester_id, subject_person_id, subject)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0003-000000000001',
             'aaaaaaaa-0000-0000-0001-000000000003', 'spam') $$,
  '42501', NULL,
  'outsider cannot create a request in vault A'
);

SELECT throws_ok(
  $$ INSERT INTO public.recording_requests (vault_id, requester_id, subject_person_id, subject)
     VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0003-000000000001',
             'aaaaaaaa-0000-0000-0001-000000000003', 'ask a stranger') $$,
  '23514', NULL,  -- the same-vault trigger fires before the RLS check
  'outsider cannot ask a vault A person from their own vault'
);

-- An UPDATE that RLS filters out affects zero rows rather than erroring.
UPDATE public.people SET bio = 'defaced' WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000';
UPDATE public.media_assets SET privacy = 'exportable' WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000';
DELETE FROM public.media_assets WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000';
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM people WHERE bio = 'defaced'),
  0,
  'outsider update of vault A people changed nothing'
);
SELECT is(
  (SELECT count(*)::int FROM media_assets WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND privacy = 'admin'),
  1,
  'outsider could not change or delete vault A recordings'
);

-- ─────────────────────────────────────────────
-- 3. Alice (admin of vault A) sees all of it — the suite is not vacuous
-- ─────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-0000-0000-000000000000","role":"authenticated"}', true);

SELECT cmp_ok(n, '>', 0::bigint, format('vault admin sees vault A rows in %s', tbl))
  FROM pg_temp.vault_a_rows()
  WHERE tbl <> 'contributor_tokens';

SELECT is(
  (SELECT count(*)::int FROM public.contributor_tokens),
  0,
  'contributor_tokens is unreadable even to a vault admin (service role only)'
);

SELECT is(
  (SELECT count(*)::int FROM public.search_transcripts('aaaaaaaa-0000-0000-0000-000000000000', 'zanzibar')),
  2,
  'vault admin search finds both family and admin-only recordings'
);
RESET ROLE;

-- ─────────────────────────────────────────────
-- 4. Amy (plain member of vault A): admin-only privacy holds everywhere
-- ─────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a2a2a2a2-0000-0000-0000-000000000000","role":"authenticated"}', true);

SELECT is(
  (SELECT array_agg(privacy) FROM public.media_assets WHERE vault_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  ARRAY['family'],
  'member sees the family recording but not the admin-only one'
);
SELECT is(
  (SELECT count(*)::int FROM public.transcripts WHERE media_asset_id = 'aaaaaaaa-0000-0000-0006-000000000002'),
  0,
  'member cannot read the admin-only transcript'
);
SELECT is(
  (SELECT count(*)::int FROM public.media_tags WHERE media_asset_id = 'aaaaaaaa-0000-0000-0006-000000000002'),
  0,
  'member cannot see tags on the admin-only recording'
);
SELECT is(
  (SELECT count(*)::int FROM public.search_transcripts('aaaaaaaa-0000-0000-0000-000000000000', 'zanzibar')),
  1,
  'member search does not surface the admin-only recording'
);
SELECT is(
  (SELECT count(*)::int FROM public.audit_log),
  0,
  'member cannot read the audit log'
);

SELECT throws_ok(
  $$ INSERT INTO public.recording_requests (vault_id, requester_id, subject_person_id, subject)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0003-000000000001',
             'aaaaaaaa-0000-0000-0001-000000000003', 'pretending to be Alice') $$,
  '42501', NULL,
  'member cannot create a request as another member'
);

SELECT lives_ok(
  $$ INSERT INTO public.recording_requests (vault_id, requester_id, subject_person_id, subject)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0003-000000000002',
             'aaaaaaaa-0000-0000-0001-000000000003', 'Tell me about the farm') $$,
  'member can create a request as themselves for a person in their vault'
);

SELECT throws_ok(
  $$ INSERT INTO public.people (vault_id, given_name) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'Cousin') $$,
  '42501', NULL,
  'plain member cannot add people (admin only)'
);
RESET ROLE;

-- ─────────────────────────────────────────────
-- 5. Anonymous: nothing at all
-- ─────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is(
  (SELECT sum(n)::int FROM pg_temp.vault_a_rows()),
  0,
  'anonymous caller sees no rows in any table'
);
RESET ROLE;

-- ─────────────────────────────────────────────
-- 6. Integrity: no reference may cross a vault boundary, even for the service role
-- ─────────────────────────────────────────────
SELECT throws_ok(
  $$ INSERT INTO family_children (family_unit_id, person_id)
     VALUES ('aaaaaaaa-0000-0000-0002-000000000001', 'bbbbbbbb-0000-0000-0001-000000000001') $$,
  '23514', NULL,
  'a vault B person cannot be made a child in a vault A family'
);
SELECT throws_ok(
  $$ INSERT INTO family_partners (family_unit_id, person_id)
     VALUES ('aaaaaaaa-0000-0000-0002-000000000001', 'bbbbbbbb-0000-0000-0001-000000000001') $$,
  '23514', NULL,
  'a vault B person cannot be made a partner in a vault A family'
);
SELECT throws_ok(
  $$ INSERT INTO media_assets (vault_id, person_id, storage_path, mime_type)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0001-000000000001', 'x', 'audio/mp4') $$,
  '23514', NULL,
  'a vault A recording cannot belong to a vault B person'
);
SELECT throws_ok(
  $$ INSERT INTO contributor_tokens (token_hash, person_id, vault_id, expires_at)
     VALUES (repeat('cd', 32), 'bbbbbbbb-0000-0000-0001-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', now()) $$,
  '23514', NULL,
  'a vault A token cannot be issued to a vault B person'
);
SELECT throws_ok(
  $$ INSERT INTO contributor_tokens (token_hash, person_id, vault_id, expires_at)
     VALUES ('not-a-hash', 'aaaaaaaa-0000-0000-0001-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', now()) $$,
  '23514', NULL,
  'contributor_tokens rejects anything that is not a SHA-256 hex digest'
);

SELECT * FROM finish();
ROLLBACK;
