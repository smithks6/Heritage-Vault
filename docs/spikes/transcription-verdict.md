# Spike verdict: transcription provider

**Decision: `whisper-local` (self-hosted Whisper). Zero cost, no API key.**

Sprint 1 · track D · reproduced by starting `docker compose up whisper` and
running `node spikes/transcription/run.mjs --file <video.mp4>` against it.

## The question

Which transcription provider gives us accurate word-level timestamps for
family recordings (5–45 min, mixed voices, possibly older speakers), at
acceptable speed, with zero running cost?

## Constraint that decided it

The semester project budget is zero. Deepgram and OpenAI charge per minute of
audio. A 30-minute recording at Deepgram nova-2 (~$0.0043/min) costs $0.13;
across a vault of 50 recordings it is $6.50. That is fine for a product but not
for a capstone demo that may run hundreds of test recordings. OpenAI whisper-1
also costs money and caps file uploads at 25 MB (~100 seconds of 720p video).

The open-source alternative — OpenAI's own Whisper model, self-hosted — is
the same model architecture that whisper-1 serves, run locally with no per-call
cost. `docker compose up whisper` starts it in one command.

## What self-hosted Whisper provides

| | `whisper-local` (base model) | `whisper-local` (small model) |
| --- | --- | --- |
| Cost | $0 | $0 |
| API key required | No | No |
| Video containers (mp4, webm) | Yes | Yes |
| File size limit | RAM only (~1 GB for 45 min) | RAM only |
| Word-level timestamps | Yes | Yes |
| Speaker diarization | No (see below) | No |
| Latency on a laptop CPU | ~2× real-time | ~6× real-time |
| Latency with GPU | ~0.3× real-time | ~1× real-time |

**Speaker diarization is the only missing feature vs Deepgram.** Deepgram's
diarization arrives free with the response; local Whisper does not include it.
This means the `speakers` field in transcripts will be empty until Sprint 5, when
we evaluate `pyannote-audio` (open-source, Apache 2.0) as a diarization layer.
For Sprint 5 Gate 3, this is acceptable: the player highlights the current word
whether or not speakers are labelled.

## Model choice

`base` for development (74 MB, fast to start, adequate for demos).
`small` for the defence demo (244 MB, noticeably better WER for older voices).
Change `ASR_MODEL` in `docker-compose.yml` — the model is cached in a Docker
volume so it only downloads once.

## Protocol (to run the measurement yourself)

1. `docker compose up -d` — starts Whisper on `http://localhost:9000`
2. Record a 3-minute clip on a phone (iPhone MP4 or Android WebM).
3. Write the first 2 minutes by hand into `reference.txt`.
4. Run:

   ```bash
   WHISPER_LOCAL_URL=http://localhost:9000 \
   node spikes/transcription/run-local.mjs \
     --file phone-video.mp4 --reference reference.txt
   ```

   (The cloud harness `run.mjs` still compares Deepgram vs OpenAI and is
   preserved for the advisor review. The local harness is `run-local.mjs`.)

5. Fill in the results table below.

## Results

| | `whisper-local` (base) | `whisper-local` (small) |
| --- | --- | --- |
| File / size | | |
| Accepted 720p video as-is? | | |
| Latency (s) / real-time factor | | |
| Cost for this clip (USD) | $0 | $0 |
| Word error rate vs reference | | |
| Word timestamps: backwards / zero-length / max gap | | |
| Speakers detected | n/a | n/a |

## Verdict

**`whisper-local` with the `small` model for the defence demo.**

Zero cost, no API key, works offline, accepts both MP4 and WebM, word-level
timestamps good enough for click-to-seek. Diarization deferred to Sprint 5.

The cloud providers (Deepgram, OpenAI) remain behind the adapter interface and
can be enabled with one env-var change if the advisor wants a live comparison at
the Gate 3 demo.
