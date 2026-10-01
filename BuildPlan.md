# HeritageVault — Design & Build Plan (v2)
 
Planning artifact for the SFASU CS Fall capstone, derived from the Burchfield
roadmap (`HeritageVault_Semester_Proposal_and_Roadmap.pdf`). **No implementation
has begun.**
 
## Deliverables
 
- **Build plan** — architecture, data model, pipeline, design direction, 16-week
  phase plan, risk register: https://claude.ai/code/artifact/88bc8a4e-0383-4b52-a227-98134613605c
- **Screen prototype** — 14 clickable mockups (7 contributor, 7 member) with the
  design reasoning for each: https://claude.ai/code/artifact/9a401756-a3c1-4cef-9bd0-2670d87d45ab
- **Sprint timeline** — the 11 remaining weeks as one-week sprints, with capacity
  arithmetic, three decision gates and a Friday demo per sprint:
  https://claude.ai/code/artifact/032d6100-43fb-4b3d-8cfd-1a8c2b164aaf
## v2 additions (requested after the first pass)
 
- **Video recording alongside audio.** The requester picks the medium when they
  send the request; the contributor screen shows exactly one button either way.
- **Requests with a subject.** Any member can ask any relative in the vault for
  a recording on a named subject. The request — not the upload — is the unit of
  work, with a state, an expiry, a requester and an attached recording.
- **A family tree, not a list.** The vault is browsed as a tree; each person is
  a node holding their recordings. Largest addition; drives the data model.
- **Responsive web only.** Mobile Safari, Android Chrome, desktop. No native
  apps, no PWA install requirement.
Two consequences fall out:
 
- **Deepgram replaces `whisper-1` as the default transcriber.** OpenAI's 25 MB
  cap is ~100 seconds of 720p video. Deepgram takes 2 GB, accepts video
  containers, and transcribes **from a remote URL** — so a signed storage link
  goes straight to it and the video never passes through our compute. OpenAI
  stays behind the same interface as fallback.
- **People and accounts are separate tables.** A friends-and-requests feature
  pulls toward giving everyone an account, which would kill the founding
  scenario. Three tiers: *member* (account), *light contributor* (link only,
  never signs in), *remembered person* (deceased/absent, holds recordings,
  makes none). The tree is the friends list — no parallel social graph.
## Decisions locked in this session
 
| Decision | Choice |
| --- | --- |
| Stack | Next.js 16 (App Router) on Vercel + Supabase (Postgres, Auth, Storage, Edge Functions) |
| Team shape | 2–4 people, ~10 hrs/week each, four tracks: Platform/Data, Contributor, Archive/Admin, Pipeline |
| Paid services | Behind adapter interfaces with working local fakes; real providers swapped in via `PROVIDER_MODE` |
| Contributor access | Opaque 32-byte token in the URL → short-lived signed httpOnly cookie. **Not** Supabase Auth. |
| Transcription | Deepgram (2 GB limit, video containers, remote-URL input, word timings + diarization); OpenAI `whisper-1` as fallback |
| Capture | Video and audio, both in-browser; 720p and duration caps |
| Family tree | GEDCOM model — `people` (INDI) + `family_units` (FAM) + partner/child joins. **No `parent_id`.** |
| Tree rendering | Decided by a timeboxed Week 3 spike: `family-chart` or `d3-dag`. Not `d3-hierarchy`/`react-d3-tree`. |
| Export | GEDZip — GEDCOM 7 file plus all media in one zip, importable into FamilySearch/Ancestry |
 
## Phase 0 findings (verified against vendor docs, Sept 2026)
 
1. **Safari records MP4/AAC only** — no WebM. Chrome/Firefox prefer
   `audio/webm;codecs=opus`. Must feature-detect with
   `MediaRecorder.isTypeSupported()`. iOS Safari 14.5+ supports MediaRecorder.
2. **Anonymous upload path**: server `createSignedUploadUrl()` (2-hour validity)
   → browser `uploadToSignedUrl()`, which needs no session and no RLS grant.
3. **Supabase has no S3-style storage trigger.** Use a Database Webhook (a
   Postgres trigger calling `supabase_functions.http_request`) on a
   `media_assets` row transition.
4. **`signInWithOtp({ phone })` sends a typed 6-digit code**, not a tappable
   link — unusable for the contributor flow. Email magic link for admins only.
5. **OpenAI transcription caps uploads at 25 MB**; `whisper-1` is the only
   current model returning word-level timestamps. Long recordings need
   segmentation with rebased timestamps.
6. **A2P 10DLC campaign vetting is manual and can take several weeks.** Brand
   approval is fast; the campaign is the long pole. Must be started Week 1.
7. **Safari also records video as MP4 only** (H.264 + AAC); Chrome/Firefox
   produce `video/webm`. One detection branch serves audio and video.
8. **Deepgram**: 2 GB files, video containers, remote URLs, word-level
   timestamps, speaker diarization, callback mode. Synchronous requests time out
   around 10 minutes of processing, so long files must use the callback path.
9. **GEDCOM does not put a parent pointer on a person.** It uses INDI records
   for individuals and FAM records for family units joining partners to
   children. Current spec 7.0.18 (Feb 2026); 5.5.1 still the common interchange
   version. GEDCOM 7 defines **GEDZip** — the tree bundled with its media.
10. **A family graph is a DAG, not a tree.** `d3-hierarchy` and `react-d3-tree`
    assume one parent per node and break on the first remarriage. Use `d3-dag`,
    ELK, or `family-chart`.
## Four recommended changes to the roadmap
 
1. Start Twilio A2P 10DLC registration in **Week 1**, not Phase 2. It is the only
   task no amount of effort compresses. Ship email invites in parallel so no
   demo depends on carrier approval.
2. Ship a **walking skeleton by Week 4** (hardcoded token → record → upload →
   fixture transcript in the timeline), rather than integrating four separate
   Phase 2 workstreams around Week 9.
3. **Contributors are not user accounts.** Own the token table: expiry,
   revocation, use counting, per-contributor audit, reissue over the phone.
4. **Every paid service gets a working fake.** Zero spend during development,
   offline-capable demo, and CI that runs without external dependencies.
## Deviations from the roadmap's stated technical approach
 
Raise both with the advisor rather than let them surface at the defence.
 
- Roadmap says *"time-bound JWT access tokens sent via SMS"*. Plan uses an
  opaque random token in the URL, exchanged server-side for a signed cookie. A
  JWT in a URL cannot be revoked before expiry and makes the SMS long.
- Roadmap says *"WebRTC and MediaRecorder"*. Plan uses `getUserMedia` +
  `MediaRecorder` only. WebRTC proper is for peer streaming and would add a
  signalling server with no purpose here.
## What gets cut to make room
 
Video + tree + requests add ~5.5 weeks to a full 16-week plan. Cut to future
work: inline transcript correction; the audit-log *viewer* (keep the table);
search facets; automatic tag extraction (demoted to stretch — diarization
arrives free with Deepgram and covers most of the value); the separate
story-detail screen (merged into the person profile).
 
That recovers ~4 weeks against 5.5 added; the rest comes out of the Week 9
buffer. Survivable at four people, tight at two.
 
**Week 9 checkpoint — decide, don't discover.** If the contributor flow is not
working end to end on a real phone with real video by the Week 9 milestone, cut
one of the two large features: either the tree degrades to a grouped list for
the whole project, or video drops back to a stretch goal and the semester ships
the audio product well. Both are defensible at a defence. Finding in Week 14
that neither is finished is not.
 
## Roadmap coverage check
 
Every bullet in the source roadmap maps to a week in the plan.
 
| Roadmap phase | Bullet | Covered |
| --- | --- | --- |
| 1 | System architecture setup | Wk 1 |
| 1 | Data schemas (Vault, Profile, Token, Media Asset, Transcript) | Wk 2 — all five present, plus vault_members, tags, prompts, audit_log |
| 1 | UI/UX wireframes, both surfaces | Wk 3 + screen prototype |
| 1 | Dev infrastructure (repo, branches, CI/CD, envs) | Wk 1 |
| 2 | Tokenized access engine (Twilio + email) | Wk 5, Wk 8 |
| 2 | In-browser recording, progress, fail-safe caching | Wk 6 |
| 2 | Automated speech-to-text, timestamped transcripts | Wk 7 |
| 2 | Secure media storage, policies, media optimization | Wk 8 |
| 3 | Interactive family timeline with playback + transcripts | Wk 10 |
| 3 | Full-text search across transcripts, dates, people, topics | Wk 11 |
| 3 | Privacy toggles (admin-only / family / exportable) | Wk 12 |
| 4 | Usability & accessibility testing | Wk 13 |
| 4 | Security audit | Wk 14 |
| 4 | Documentation & handoff | Wk 15 |
| 4 | Final capstone presentation | Wk 16 |
 
## Execution: 11 one-week sprints
 
The 16-week plan is the reference; the **sprint timeline artifact is the schedule
being worked to**. ~11 weeks remain in the semester, 1-week sprints, and all four
major features (video, family tree, requests, search) are non-negotiable.
 
Eight build sprints, then three for testing, security/handoff and rehearsal.
 
| Sprint | Focus | Friday demo |
| --- | --- | --- |
| 1 | Foundations, schema+RLS, **both spikes** | Two written verdicts + live schema |
| 2 | Walking skeleton, with video | Phone records video → appears in app |
| 3 | The recorder, properly | Record on 2 real phones, survive a dropped connection |
| 4 | Requests and tokens | Ask → link → record → request fulfilled |
| 5 | Transcription for real (Deepgram) | Real video → real transcript with word timings |
| 6 | The family tree (read-only) | Navigate 4 generations, click through to recordings |
| 7 | Playback and search | Search a word said at 40:00 and play from that second |
| 8 | Privacy, GEDZip export, edges — **feature freeze** | Viewer role provably blocked; export opens elsewhere |
| 9 | Usability + accessibility | 5 sessions, one headline number |
| 10 | Security audit + handoff | Stranger goes clone → running from the runbook |
| 11 | Rehearse and defend | The defence |
 
**What makes it fit** (not working faster): the family tree is **read-only** over
seeded data — no add/edit-person UI this semester (saves ~a sprint); each feature
gets one happy path built well, with the contributor capture flow as the sole
exception that keeps the full quality bar; **email is the primary delivery path
and SMS the bonus**, since 10DLC vetting may not clear in 11 weeks; rich seed data
does the work an admin CRUD interface would.
 
### Three gates — decide on a Friday, don't discover in Sprint 10
 
- **Gate 1, end of Sprint 1** — can the tree be drawn (remarriage + adopted child
  in a real library)? If not → generation-grouped list for the whole project.
- **Gate 2, end of Sprint 3** — does video work on real phones incl. connection
  recovery? If not → video becomes a stretch goal, ship audio properly.
- **Gate 3, end of Sprint 5** — is transcription reliable at 45 min with a
  callback that may never arrive? If not → transcripts best-effort, search
  narrows to titles/subjects/person names.
### Also cut for the 11-week run
 
Notification digests/reminders; cross-vault connections; native apps and PWA
install — on top of the v2 cuts above.
 
## Immediate next steps (not yet started)
 
1. Review the two artifacts with the team and the advisor.
2. Confirm the stack choice and the contributor-token deviation.
3. Start the Twilio A2P 10DLC registration — this is the Week 1 critical path.
4. Run the Week 1 transcription spike (one real 720p phone video at Deepgram and
   at OpenAI; record cost, latency, timestamp quality).
5. Run the Week 3 tree-layout spike against a seed containing a remarriage and
   an adopted child before committing to a library.
6. Then, and only then, scaffold the repo.
**Day-one checklist (urgent items first):** 10DLC campaign submitted and the
verification SMS answered; email delivery working end to end; both spikes
verdicted and Gate 1 decided out loud; spend caps set on all four providers;
a physical iPhone and Android secured for every sprint; 5 usability participants
identified by name now so Sprint 9 is testing rather than recruiting; a standing
30-minute Friday demo in everyone's calendar for all 11 weeks, advisor invited.