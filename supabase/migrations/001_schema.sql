-- Heritage Vault — initial schema
-- GEDCOM-inspired model: people (INDI) + family_units (FAM) + joins

-- ─────────────────────────────────────────────
-- Vaults (one per family)
-- ─────────────────────────────────────────────
CREATE TABLE vaults (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- People — INDI records
-- Three tiers: member | light_contributor | remembered
-- ─────────────────────────────────────────────
CREATE TABLE people (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id     UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  given_name   TEXT NOT NULL,
  family_name  TEXT,
  birth_year   INT,
  death_year   INT,
  bio          TEXT,
  photo_url    TEXT,
  is_deceased  BOOLEAN NOT NULL DEFAULT false,
  tier         TEXT NOT NULL DEFAULT 'remembered'
                 CHECK (tier IN ('member','light_contributor','remembered')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Vault members (signed-in accounts)
-- ─────────────────────────────────────────────
CREATE TABLE vault_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id   UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id  UUID REFERENCES people(id),           -- which person this account is
  role       TEXT NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin','member')),
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vault_id, user_id)
);

-- ─────────────────────────────────────────────
-- Family units — FAM records (no parent_id on person)
-- ─────────────────────────────────────────────
CREATE TABLE family_units (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id       UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  marriage_year  INT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Partners in a family unit (spouses/partners)
CREATE TABLE family_partners (
  family_unit_id  UUID NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (family_unit_id, person_id)
);

-- Children in a family unit
CREATE TABLE family_children (
  family_unit_id  UUID NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  adopted         BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (family_unit_id, person_id)
);

-- ─────────────────────────────────────────────
-- Recording requests
-- ─────────────────────────────────────────────
CREATE TABLE recording_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id          UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  requester_id      UUID NOT NULL REFERENCES vault_members(id),
  subject_person_id UUID NOT NULL REFERENCES people(id),  -- who is asked to record
  subject           TEXT NOT NULL,                         -- what they're asked to record
  medium            TEXT NOT NULL DEFAULT 'audio'
                      CHECK (medium IN ('audio','video')),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','fulfilled','expired','declined')),
  expires_at        TIMESTAMPTZ,
  fulfilled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Contributor tokens (opaque 32-byte, httpOnly cookie exchange)
-- ─────────────────────────────────────────────
CREATE TABLE contributor_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT UNIQUE NOT NULL,               -- hex(32 random bytes)
  person_id   UUID NOT NULL REFERENCES people(id),
  vault_id    UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  request_id  UUID REFERENCES recording_requests(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_count  INT NOT NULL DEFAULT 0,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Media assets (recordings)
-- ─────────────────────────────────────────────
CREATE TABLE media_assets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id              UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  person_id             UUID NOT NULL REFERENCES people(id),
  request_id            UUID REFERENCES recording_requests(id),
  storage_path          TEXT NOT NULL,
  mime_type             TEXT NOT NULL,
  duration_seconds      INT,
  size_bytes            BIGINT,
  title                 TEXT,
  recorded_at           TIMESTAMPTZ,
  privacy               TEXT NOT NULL DEFAULT 'family'
                          CHECK (privacy IN ('admin','family','exportable')),
  transcription_status  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (transcription_status IN ('pending','processing','done','failed')),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Transcripts
-- ─────────────────────────────────────────────
CREATE TABLE transcripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id  UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('deepgram','openai','fake')),
  full_text       TEXT,
  word_timings    JSONB,   -- [{word,start,end,confidence,speaker?}]
  speakers        JSONB,   -- [{id,label}]
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (media_asset_id)
);

-- ─────────────────────────────────────────────
-- Tags
-- ─────────────────────────────────────────────
CREATE TABLE tags (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id  UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  UNIQUE (vault_id, name)
);

CREATE TABLE media_tags (
  media_asset_id  UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_asset_id, tag_id)
);

-- ─────────────────────────────────────────────
-- Audit log
-- ─────────────────────────────────────────────
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id     UUID REFERENCES vaults(id) ON DELETE CASCADE,
  actor_type   TEXT CHECK (actor_type IN ('member','contributor','system')),
  actor_id     UUID,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Full-text search index on transcripts
-- ─────────────────────────────────────────────
CREATE INDEX transcripts_fts_idx
  ON transcripts USING gin(to_tsvector('english', coalesce(full_text, '')));

-- ─────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────
ALTER TABLE vaults              ENABLE ROW LEVEL SECURITY;
ALTER TABLE people              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_partners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_children     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a member of a vault?
CREATE OR REPLACE FUNCTION is_vault_member(vault UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault_members
    WHERE vault_id = vault AND user_id = auth.uid()
  );
$$;

-- Helper: is the caller an admin of a vault?
CREATE OR REPLACE FUNCTION is_vault_admin(vault UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault_members
    WHERE vault_id = vault AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Vault: members can read their own vault
CREATE POLICY vaults_select ON vaults FOR SELECT
  USING (is_vault_member(id));

-- People: vault members can read people in their vault
CREATE POLICY people_select ON people FOR SELECT
  USING (is_vault_member(vault_id));

CREATE POLICY people_insert ON people FOR INSERT
  WITH CHECK (is_vault_admin(vault_id));

CREATE POLICY people_update ON people FOR UPDATE
  USING (is_vault_admin(vault_id));

-- Vault members: can see other members in their vault
CREATE POLICY vault_members_select ON vault_members FOR SELECT
  USING (is_vault_member(vault_id));

-- Family units
CREATE POLICY family_units_select ON family_units FOR SELECT
  USING (is_vault_member(vault_id));

CREATE POLICY family_partners_select ON family_partners FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_units fu WHERE fu.id = family_unit_id AND is_vault_member(fu.vault_id)
  ));

CREATE POLICY family_children_select ON family_children FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_units fu WHERE fu.id = family_unit_id AND is_vault_member(fu.vault_id)
  ));

-- Requests: members of the vault can read/create
CREATE POLICY requests_select ON recording_requests FOR SELECT
  USING (is_vault_member(vault_id));

CREATE POLICY requests_insert ON recording_requests FOR INSERT
  WITH CHECK (is_vault_member(vault_id));

-- Media assets: family members can read family-privacy assets
CREATE POLICY media_assets_select ON media_assets FOR SELECT
  USING (
    is_vault_member(vault_id) AND
    (privacy = 'family' OR privacy = 'exportable' OR is_vault_admin(vault_id))
  );

-- Transcripts: follow the media asset's policy
CREATE POLICY transcripts_select ON transcripts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM media_assets ma
    WHERE ma.id = media_asset_id
      AND is_vault_member(ma.vault_id)
      AND (ma.privacy IN ('family','exportable') OR is_vault_admin(ma.vault_id))
  ));

-- Tags
CREATE POLICY tags_select ON tags FOR SELECT USING (is_vault_member(vault_id));
CREATE POLICY media_tags_select ON media_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM media_assets ma WHERE ma.id = media_asset_id AND is_vault_member(ma.vault_id)
  ));

-- Audit log: admins only
CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (is_vault_admin(vault_id));

-- ─────────────────────────────────────────────
-- Storage bucket
-- ─────────────────────────────────────────────
-- Run this in the Supabase dashboard Storage section OR via CLI:
-- supabase storage create vault-media --public=false

-- ─────────────────────────────────────────────
-- DB webhook to trigger transcription
-- (requires pg_net extension)
-- Fires when media_assets.transcription_status changes to 'pending'
-- ─────────────────────────────────────────────
-- See: supabase/functions/transcribe/index.ts for the edge function
