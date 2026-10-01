/**
 * Fake transcription provider — deterministic fixture data.
 *
 * Zero latency, zero spend, works fully offline.
 * Used in development and CI (PROVIDER_TRANSCRIPTION=fake).
 */

import type { TranscriptionProvider, TranscriptionRequest, TranscriptionResult } from "./transcription";

const FIXTURE_TRANSCRIPT =
  "This is a test recording. The fake transcription provider generates " +
  "placeholder word timings so you can develop and test the playback " +
  "interface without any external API keys or real audio files.";

export class FakeProvider implements TranscriptionProvider {
  async transcribe(_req: TranscriptionRequest): Promise<TranscriptionResult> {
    const words = FIXTURE_TRANSCRIPT.split(/\s+/);
    const wordTimings = words.map((word, i) => ({
      word: word.replace(/[.,!?]$/, ""),
      start: i * 0.5,
      end: i * 0.5 + 0.4,
      confidence: 0.99,
    }));

    // Simulate slight processing delay
    await new Promise((r) => setTimeout(r, 50));

    return {
      fullText: FIXTURE_TRANSCRIPT,
      wordTimings,
      speakers: [{ id: "speaker_0", label: "Speaker 1" }],
      provider: "fake",
      async: false,
    };
  }
}
