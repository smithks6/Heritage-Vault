-- Heritage Vault — seed data (Burchfield family demo)
-- Run after migrations. Uses service role to bypass RLS.

-- ─────────────────────────────────────────────
-- Vault
-- ─────────────────────────────────────────────
INSERT INTO vaults (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'The Burchfield Family', 'burchfield');

-- ─────────────────────────────────────────────
-- People (4 generations)
-- ─────────────────────────────────────────────
INSERT INTO people (id, vault_id, given_name, family_name, birth_year, death_year, is_deceased, tier, bio) VALUES
  -- Generation 1 (great-grandparents)
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Earl',   'Burchfield', 1920, 1998, true, 'remembered',
   'Served in the Pacific theater, came home to farm the land outside Nacogdoches.'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Mabel',  'Burchfield', 1923, 2005, true, 'remembered',
   'Raised six children and kept the family recipes in a handwritten notebook that still exists.'),

  -- Generation 2
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'James',  'Burchfield', 1948, 2019, true, 'remembered',
   'Worked for the railroad for 35 years. Never missed a Sunday dinner.'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Dorothy','Burchfield', 1950, NULL, false, 'remembered',
   'Retired schoolteacher; remembers every student''s name.'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Ruth',   'Hawkins',    1952, NULL, false, 'light_contributor',
   'Earl and Mabel''s daughter. Lives in Houston; has stories of the farm.'),

  -- Generation 3
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Michael','Burchfield', 1975, NULL, false, 'member',
   'James and Dorothy''s son. Started this vault.'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Susan',  'Burchfield', 1978, NULL, false, 'member',
   'James and Dorothy''s daughter.'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Carol',  'Webb',       1977, NULL, false, 'light_contributor',
   'Michael''s wife.'),

  -- Generation 4
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
   'Emma',   'Burchfield', 2004, NULL, false, 'member',
   'Michael and Carol''s daughter.'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Liam',   'Burchfield', 2007, NULL, false, 'remembered',
   'Michael and Carol''s son.');

-- ─────────────────────────────────────────────
-- Family units
-- ─────────────────────────────────────────────
INSERT INTO family_units (id, vault_id, marriage_year) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1942),  -- Earl + Mabel
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 1972),  -- James + Dorothy
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 2001);  -- Michael + Carol

INSERT INTO family_partners (family_unit_id, person_id) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008');

INSERT INTO family_children (family_unit_id, person_id) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000010');

-- ─────────────────────────────────────────────
-- Sample media assets with fake transcripts
-- ─────────────────────────────────────────────
INSERT INTO media_assets (id, vault_id, person_id, storage_path, mime_type, duration_seconds, title, recorded_at, privacy, transcription_status) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000004',
   'vault-media/burchfield/dorothy-christmas-1962.mp3',
   'audio/mpeg', 312,
   'Christmas at the farmhouse, 1962',
   '2026-03-15 14:30:00+00', 'family', 'done'),

  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000005',
   'vault-media/burchfield/ruth-earl-story.mp4',
   'video/mp4', 487,
   'Daddy''s fishing trip — the one that got away',
   '2026-04-02 10:15:00+00', 'family', 'done'),

  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000004',
   'vault-media/burchfield/dorothy-teaching.mp3',
   'audio/mpeg', 201,
   'My first year of teaching',
   '2026-05-10 09:00:00+00', 'family', 'done');

INSERT INTO transcripts (media_asset_id, provider, full_text, word_timings) VALUES
  ('30000000-0000-0000-0000-000000000001', 'fake',
   'We always had Christmas at the farmhouse back then. Mama would start baking three days before. The smell of pecan pie would fill every room. Daddy would come in from the fields and just stand in the kitchen doorway breathing it all in. All six of us kids would sleep in two rooms, and we didn''t mind one bit.',
   '[{"word":"We","start":0.0,"end":0.3},{"word":"always","start":0.4,"end":0.7},{"word":"had","start":0.8,"end":1.0},{"word":"Christmas","start":1.1,"end":1.6},{"word":"at","start":1.7,"end":1.8},{"word":"the","start":1.9,"end":2.0},{"word":"farmhouse","start":2.1,"end":2.7},{"word":"back","start":2.8,"end":3.1},{"word":"then","start":3.2,"end":3.6}]'),

  ('30000000-0000-0000-0000-000000000002', 'fake',
   'Daddy loved to fish more than just about anything. One summer he took me and James out to Lake Nacogdoches. He hooked something so big the line went singing off the reel. We were all standing up in that little boat. And then it was gone. He just sat back down, tipped his hat, and said, well, that one needed to keep living. I think about that a lot.',
   '[{"word":"Daddy","start":0.0,"end":0.5},{"word":"loved","start":0.6,"end":0.9},{"word":"to","start":1.0,"end":1.1},{"word":"fish","start":1.2,"end":1.5}]'),

  ('30000000-0000-0000-0000-000000000003', 'fake',
   'My first classroom had thirty-two desks and only twenty-eight children. I thought that was lucky. The principal came by on the first day, looked around, and said Miss Burchfield, you''ll do fine. I had no idea what I was doing but I nodded. You learn by doing in that job.',
   '[{"word":"My","start":0.0,"end":0.2},{"word":"first","start":0.3,"end":0.6},{"word":"classroom","start":0.7,"end":1.2},{"word":"had","start":1.3,"end":1.5},{"word":"thirty-two","start":1.6,"end":2.1},{"word":"desks","start":2.2,"end":2.5}]');

-- ─────────────────────────────────────────────
-- Sample recording request
-- (requester_id will be set after user signs up in dev)
-- ─────────────────────────────────────────────
-- INSERT INTO recording_requests ...
-- (Skipped — needs a real vault_members row from auth)
