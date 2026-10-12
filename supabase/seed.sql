-- Heritage Vault — seed data: "the awkward family"
--
-- Loaded by `supabase db reset` after migrations, as the postgres role (RLS
-- does not apply). This is the Gate 1 acceptance fixture as well as the demo
-- family, so every awkward shape the tree must draw is here:
--
--   * four generations, one deceased great-grandparent couple (remembered tier)
--   * a remarriage: James has a child with Linda (divorced), then two with Dorothy,
--     so Thomas is half-brother to Kyle and Susan
--   * an adopted child: Grace, adopted by Ruth and Walter
--   * a person with no recordings and no requests (Liam) — an empty branch
--   * eight recordings, four audio and four video, one of them admin-only
--
-- Local accounts (magic link via the local inbucket, or password "heritage-dev"):
--   kyle@heritage.test  admin of the vault
--   emma@heritage.test  member
--
-- Local contributor link for the walking skeleton:
--   /record/dev-token-dorothy  (only its SHA-256 is stored)

-- ─────────────────────────────────────────────
-- Vault
-- ─────────────────────────────────────────────
INSERT INTO vaults (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'The Burchfield Family', 'burchfield');

-- ─────────────────────────────────────────────
-- People
-- ─────────────────────────────────────────────
INSERT INTO people (id, vault_id, given_name, family_name, birth_year, death_year, is_deceased, tier, bio) VALUES
  -- Generation 1
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Earl',    'Burchfield', 1920, 1998, true,  'remembered',
   'Served in the Pacific theater, came home to farm the land outside Nacogdoches.'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Mabel',   'Burchfield', 1923, 2005, true,  'remembered',
   'Kept the family recipes in a handwritten notebook that still exists.'),

  -- Generation 2
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'James',   'Burchfield', 1948, 2019, true,  'remembered',
   'Worked for the railroad for 35 years. Never missed a Sunday dinner.'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'Linda',   'Price',      1950, NULL, false, 'remembered',
   'James''s first wife. Thomas''s mother. Lives in Tyler.'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Dorothy', 'Burchfield', 1951, NULL, false, 'light_contributor',
   'Retired schoolteacher; remembers every student''s name.'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Ruth',    'Hawkins',    1952, NULL, false, 'light_contributor',
   'Earl and Mabel''s daughter. Lives in Houston; has stories of the farm.'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   'Walter',  'Hawkins',    1949, NULL, false, 'light_contributor',
   'Ruth''s husband. Ran a hardware store in Lufkin for thirty years.'),

  -- Generation 3
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001',
   'Thomas',  'Burchfield', 1970, NULL, false, 'light_contributor',
   'James and Linda''s son. Half-brother to Kyle and Susan.'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Kyle',    'Burchfield', 1976, NULL, false, 'member',
   'James and Dorothy''s son. Started this vault.'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Susan',   'Burchfield', 1979, NULL, false, 'light_contributor',
   'James and Dorothy''s daughter.'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Carol',   'Webb',       1977, NULL, false, 'light_contributor',
   'Kyle''s wife.'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001',
   'Grace',   'Hawkins',    1985, NULL, false, 'light_contributor',
   'Adopted by Ruth and Walter in 1987.'),

  -- Generation 4
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
   'Emma',    'Burchfield', 2004, NULL, false, 'member',
   'Kyle and Carol''s daughter.'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Liam',    'Burchfield', 2007, NULL, false, 'remembered',
   'Kyle and Carol''s son. Nothing recorded yet.');

-- ─────────────────────────────────────────────
-- Family units (FAM). James appears as a partner in two of them.
-- ─────────────────────────────────────────────
INSERT INTO family_units (id, vault_id, marriage_year) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1942),  -- Earl + Mabel
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 1969),  -- James + Linda (divorced 1972)
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 1974),  -- James + Dorothy (remarriage)
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 1973),  -- Ruth + Walter
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 2001);  -- Kyle + Carol

INSERT INTO family_partners (family_unit_id, person_id) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000012'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008');

INSERT INTO family_children (family_unit_id, person_id, adopted) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', false),  -- James
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', false),  -- Ruth
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000013', false),  -- Thomas
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', false),  -- Kyle
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007', false),  -- Susan
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000014', true),   -- Grace, adopted
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009', false),  -- Emma
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000010', false);  -- Liam

-- ─────────────────────────────────────────────
-- Local accounts (dev only — auth.users is never seeded in a hosted project)
-- ─────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
       u.email, extensions.crypt('heritage-dev', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
FROM (VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'kyle@heritage.test'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'emma@heritage.test')
) AS u(id, email);

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.email IN ('kyle@heritage.test', 'emma@heritage.test');

INSERT INTO vault_members (id, vault_id, user_id, person_id, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'admin'),   -- Kyle
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', 'member');  -- Emma

-- ─────────────────────────────────────────────
-- Requests: one fulfilled, one open, one declined
-- ─────────────────────────────────────────────
INSERT INTO recording_requests (id, vault_id, requester_id, subject_person_id, subject, medium, status, expires_at, fulfilled_at, created_at) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000012',
   'How you met Aunt Ruth', 'video', 'fulfilled',
   now() + interval '30 days', '2026-09-20 18:00:00+00', '2026-09-14 15:00:00+00'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004',
   'What Grandma Mabel''s kitchen smelled like', 'audio', 'pending',
   now() + interval '30 days', NULL, now() - interval '2 days'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000011',
   'The year you and Dad were married', 'audio', 'declined',
   now() + interval '30 days', NULL, '2026-09-01 12:00:00+00');

INSERT INTO contributor_tokens (token_hash, person_id, vault_id, request_id, expires_at) VALUES
  (encode(extensions.digest('dev-token-dorothy', 'sha256'), 'hex'),
   '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000002', now() + interval '30 days');

-- ─────────────────────────────────────────────
-- Recordings: four audio, four video
-- ─────────────────────────────────────────────
INSERT INTO media_assets (id, vault_id, person_id, request_id, storage_path, mime_type, duration_seconds, title, recorded_at, privacy, transcription_status) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000005', NULL,
   'burchfield/ruth-christmas-1962.m4a', 'audio/mp4', 312,
   'Christmas at the farmhouse, 1962', '2026-03-15 14:30:00+00', 'family', 'done'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000005', NULL,
   'burchfield/ruth-fishing-trip.mp4', 'video/mp4', 487,
   'Daddy''s fishing trip — the one that got away', '2026-04-02 10:15:00+00', 'family', 'done'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000004', NULL,
   'burchfield/dorothy-teaching.webm', 'audio/webm', 201,
   'My first year of teaching', '2026-05-10 09:00:00+00', 'exportable', 'done'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000001',
   'burchfield/walter-met-ruth.mp4', 'video/mp4', 744,
   'How I met Ruth', '2026-09-20 17:40:00+00', 'family', 'done'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', NULL,
   'burchfield/earl-pacific-cassette.m4a', 'audio/mp4', 1830,
   'Earl on the Pacific (1991 cassette)', '1991-07-04 20:00:00+00', 'admin', 'done'),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000013', NULL,
   'burchfield/thomas-two-houses.webm', 'video/webm', 566,
   'Growing up between two houses', '2026-06-21 19:30:00+00', 'family', 'done'),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000014', NULL,
   'burchfield/grace-came-home.mp4', 'video/mp4', 398,
   'The day I came home', '2026-07-12 16:00:00+00', 'family', 'done'),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000006', NULL,
   'burchfield/kyle-dads-railroad.webm', 'audio/webm', 655,
   'Dad''s railroad stories, as I remember them', '2026-08-30 21:10:00+00', 'family', 'done');

INSERT INTO transcripts (media_asset_id, provider, full_text) VALUES
  ('30000000-0000-0000-0000-000000000001', 'fake',
   'We always had Christmas at the farmhouse back then. Mama would start baking three days before. The smell of pecan pie would fill every room. Daddy would come in from the fields and just stand in the kitchen doorway breathing it all in. All six of us kids would sleep in two rooms, and we didn''t mind one bit.'),
  ('30000000-0000-0000-0000-000000000002', 'fake',
   'Daddy loved to fish more than just about anything. One summer he took me and James out to Lake Nacogdoches. He hooked something so big the line went singing off the reel. We were all standing up in that little boat. And then it was gone. He just sat back down, tipped his hat, and said, well, that one needed to keep living. I think about that a lot.'),
  ('30000000-0000-0000-0000-000000000003', 'fake',
   'My first classroom had thirty-two desks and only twenty-eight children. I thought that was lucky. The principal came by on the first day, looked around, and said Miss Burchfield, you''ll do fine. I had no idea what I was doing but I nodded. You learn by doing in that job.'),
  ('30000000-0000-0000-0000-000000000004', 'fake',
   'Ruth came into the hardware store looking for a hinge for a screen door. I told her we were out, which was a lie. I wanted her to come back on Saturday. She came back on Saturday and bought the hinge and told me she knew the whole time. We were married that October.'),
  ('30000000-0000-0000-0000-000000000005', 'fake',
   'We shipped out of San Diego in forty-three. Nobody on that boat had ever seen the ocean before except one fellow from Galveston. I don''t talk about Okinawa. I''ll say this much, I wrote your grandmother every week and she kept every letter.'),
  ('30000000-0000-0000-0000-000000000006', 'fake',
   'Weekends I was at Dad and Dorothy''s, weekdays with Mom in Tyler. I had two bedrooms and two sets of rules. Dorothy never once made me feel like a visitor. When Kyle was born I was six and I thought he was the best thing that ever happened.'),
  ('30000000-0000-0000-0000-000000000007', 'fake',
   'Mom says I was two and I wouldn''t let go of the car seat. Dad drove the whole way from Houston with one hand on the wheel and one hand back holding mine. They had a cake that said welcome home Grace. I don''t remember it but I''ve heard it so many times it feels like I do.'),
  ('30000000-0000-0000-0000-000000000008', 'fake',
   'Dad worked the Southern Pacific line for thirty-five years. He used to say the railroad was the only place where being on time was a moral question. He''d come home smelling like diesel and sit down at the table and say grace before he took his boots off.');

-- Synthetic word timings (~0.42 s per word) so the player and search can seek.
-- Real timings arrive from Deepgram in Sprint 5.
UPDATE transcripts t
SET word_timings = (
  SELECT jsonb_agg(
           jsonb_build_object('word', w, 'start', round((n - 1) * 0.42, 2), 'end', round((n - 1) * 0.42 + 0.36, 2))
           ORDER BY n)
  FROM regexp_split_to_table(t.full_text, '\s+') WITH ORDINALITY AS x(w, n)
)
WHERE word_timings IS NULL;

-- ─────────────────────────────────────────────
-- Tags
-- ─────────────────────────────────────────────
INSERT INTO tags (id, vault_id, name) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'the farm'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'war'),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'how we met');

INSERT INTO media_tags (media_asset_id, tag_id) VALUES
  ('30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003');

INSERT INTO audit_log (vault_id, actor_type, actor_id, action, target_type, target_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'member', 'b0000000-0000-0000-0000-000000000001',
   'request.created', 'recording_request', '40000000-0000-0000-0000-000000000001');
