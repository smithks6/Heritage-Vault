# Spike verdict: transcription provider

**Status: harness ready, measurements pending.** This needs a real phone video and
both API keys. The build plan's default is Deepgram, with OpenAI `whisper-1` behind
the same interface as fallback. This spike exists so that default is decided on
evidence rather than on the plan.

Sprint 1 · track D · timebox: half a day once the video exists.

## Protocol

1. **Record the clip.** Use a physical phone, front camera, 720p, at least 3 minutes,
   one person talking naturally, ideally with a second voice asking questions. Record
   it twice, once on an iPhone (MP4) and once on Android (WebM, if the browser
   produces it), because the recorder will send both formats.
2. **Write a reference transcript.** Type out the first 2 minutes by hand into
   `reference.txt`. This is the only way to get a word error rate.
3. **Upload the clip to the staging Supabase bucket.** Generate a signed read URL
   valid for 1 hour. This tests the path production will use, where Deepgram fetches
   the file and it never passes through our compute.
4. **Run the harness:**

   ```bash
   DEEPGRAM_API_KEY=… OPENAI_API_KEY=… node spikes/transcription/run.mjs \
     --file iphone-720p.mp4 --url "<signed url>" --reference reference.txt \
     --deepgram-price <USD/min from pricing page> --openai-price <USD/min from pricing page>
   ```

5. **Run it again on the Android file.** Run once more without `--url`, to compare
   upload against remote URL.
6. **Fill in the table and decide.**

The harness also flags anything that would break the click-to-seek player: words
whose timestamps go backwards, words with zero length, and the largest silence gap.

## Results

| | Deepgram (`nova-3`) | OpenAI (`whisper-1`) |
| --- | --- | --- |
| File / size | | |
| Accepted the 720p video as-is? | | |
| Remote URL input worked? | | n/a (upload only) |
| Latency (s) / real-time factor | | |
| Cost for this clip (USD) | | |
| Word error rate vs reference | | |
| Word timestamps: backwards / zero-length / max gap | | |
| Speakers detected | | n/a |

## Decision criteria

Choose Deepgram unless OpenAI is clearly better on word error rate for our speakers,
for example older voices or a regional accent. Even then, OpenAI's 25 MB limit is
about 100 seconds of 720p video. Using it would mean extracting the audio track and
splitting long recordings, and both of those land in Sprint 5.

## Verdict

_To be written after the run: provider, model, and the one number that justified it._
