-- Heritage Vault — RLS hardening (Sprint 1)
--
-- Fixes found while writing the cross-vault denial suite
-- (supabase/tests/database/cross_vault_denial.test.sql):
--
--   1. search_transcripts was SECURITY DEFINER with no membership check, so any
--      signed-in user could search any vault, admin-only recordings included.
--      It now runs as the caller, so the media_assets/transcripts policies apply.
--   2. SECURITY DEFINER helpers had a mutable search_path.
--   3. Members could insert a request with someone else's requester_id, or for
--      a person in another vault.
--   4. media_tags ignored the media asset's privacy level.
--   5. Raw contributor tokens were stored. Only the SHA-256 hash is kept now.
--   6. Nothing stopped a family unit, request or recording from pointing at a
--      person in a different vault. A leaked person node leaks a family.

-- ─────────────────────────────────────────────
-- 2. Helpers: pinned search_path, schema-qualified
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_vault_member(vault UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_members
    WHERE vault_id = vault AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_vault_admin(vault UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vault_members
    WHERE vault_id = vault AND user_id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_vault_member(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_vault_admin(UUID)  FROM anon;

-- ─────────────────────────────────────────────
-- 1. Search runs as the caller
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_transcripts(vault UUID, query TEXT)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  recorded_at      TIMESTAMPTZ,
  mime_type        TEXT,
  duration_seconds INT,
  snippet          TEXT,
  person           JSONB
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  tsq TSQUERY := plainto_tsquery('english', query);
BEGIN
  RETURN QUERY
    SELECT
      ma.id,
      ma.title,
      ma.recorded_at,
      ma.mime_type,
      ma.duration_seconds,
      ts_headline(
        'english',
        COALESCE(t.full_text, ''),
        tsq,
        'MaxFragments=1,MaxWords=20,StartSel=<mark>,StopSel=</mark>'
      ) AS snippet,
      jsonb_build_object(
        'id',          p.id,
        'given_name',  p.given_name,
        'family_name', p.family_name
      ) AS person
    FROM public.transcripts t
    JOIN public.media_assets ma ON ma.id = t.media_asset_id
    JOIN public.people p ON p.id = ma.person_id
    WHERE
      ma.vault_id = vault
      AND to_tsvector('english', COALESCE(t.full_text, '')) @@ tsq
    ORDER BY
      ts_rank(to_tsvector('english', COALESCE(t.full_text, '')), tsq) DESC
    LIMIT 30;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_transcripts(UUID, TEXT) FROM anon;

-- ─────────────────────────────────────────────
-- 3. Requests: requester must be the caller, subject must be in the vault
-- ─────────────────────────────────────────────
DROP POLICY requests_insert ON recording_requests;

CREATE POLICY requests_insert ON recording_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vault_members vm
      WHERE vm.id = requester_id
        AND vm.vault_id = recording_requests.vault_id
        AND vm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM people p
      WHERE p.id = subject_person_id
        AND p.vault_id = recording_requests.vault_id
    )
  );

-- ─────────────────────────────────────────────
-- 4. media_tags follow the asset's privacy
-- ─────────────────────────────────────────────
DROP POLICY media_tags_select ON media_tags;

CREATE POLICY media_tags_select ON media_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM media_assets ma
    WHERE ma.id = media_asset_id
      AND is_vault_member(ma.vault_id)
      AND (ma.privacy IN ('family','exportable') OR is_vault_admin(ma.vault_id))
  ));

-- ─────────────────────────────────────────────
-- 5. Store only the token hash
-- ─────────────────────────────────────────────
-- No policies on contributor_tokens: only the service role reads it.
ALTER TABLE contributor_tokens RENAME COLUMN token TO token_hash;
ALTER TABLE contributor_tokens
  ADD CONSTRAINT contributor_tokens_hash_format
  CHECK (token_hash ~ '^[0-9a-f]{64}$');

-- ─────────────────────────────────────────────
-- 6. Same-vault integrity on every cross-table person reference
-- ─────────────────────────────────────────────
-- SECURITY DEFINER so the check sees the referenced person even when the
-- caller's RLS would hide it.
CREATE OR REPLACE FUNCTION public.assert_same_vault()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  expected UUID;
  pid      UUID;
  actual   UUID;
BEGIN
  IF TG_TABLE_NAME IN ('family_partners', 'family_children') THEN
    SELECT vault_id INTO expected FROM public.family_units WHERE id = NEW.family_unit_id;
    pid := NEW.person_id;
  ELSIF TG_TABLE_NAME = 'recording_requests' THEN
    expected := NEW.vault_id;
    pid := NEW.subject_person_id;
  ELSE  -- media_assets, contributor_tokens, vault_members
    expected := NEW.vault_id;
    pid := NEW.person_id;
  END IF;

  IF pid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT vault_id INTO actual FROM public.people WHERE id = pid;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION '%: person % is not in vault %', TG_TABLE_NAME, pid, expected
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER family_partners_same_vault BEFORE INSERT OR UPDATE ON family_partners
  FOR EACH ROW EXECUTE FUNCTION public.assert_same_vault();
CREATE TRIGGER family_children_same_vault BEFORE INSERT OR UPDATE ON family_children
  FOR EACH ROW EXECUTE FUNCTION public.assert_same_vault();
CREATE TRIGGER recording_requests_same_vault BEFORE INSERT OR UPDATE ON recording_requests
  FOR EACH ROW EXECUTE FUNCTION public.assert_same_vault();
CREATE TRIGGER media_assets_same_vault BEFORE INSERT OR UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION public.assert_same_vault();
CREATE TRIGGER contributor_tokens_same_vault BEFORE INSERT OR UPDATE ON contributor_tokens
  FOR EACH ROW EXECUTE FUNCTION public.assert_same_vault();
CREATE TRIGGER vault_members_same_vault BEFORE INSERT OR UPDATE ON vault_members
  FOR EACH ROW EXECUTE FUNCTION public.assert_same_vault();
