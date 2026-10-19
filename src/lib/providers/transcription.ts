/**
 * Transcription provider adapter.
 *
 * All providers satisfy the same interface so callers are insulated from
 * vendor details. Swap the active provider via PROVIDER_TRANSCRIPTION env var.
 *
 * "fake"          — deterministic fixture, zero latency, works offline (default)
 * "whisper-local" — self-hosted Whisper via docker-compose.yml, free, no API key
 * "deepgram"      — 2 GB limit, video containers, remote-URL input, callback mode
 * "openai"        — whisper-1, 25 MB limit, audio only, synchronous
 */

export interface TranscriptionRequest {
  /** Publicly accessible URL to the media file (Supabase signed URL). */
  mediaUrl: string;
  mimeType: string;
  /** Supabase media_assets.id — round-tripped via Deepgram metadata / OpenAI. */
  assetId: string;
  /** Optional webhook URL for async (Deepgram callback mode only). */
  callbackUrl?: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  speaker?: string;
}

export interface TranscriptionResult {
  fullText: string;
  wordTimings: WordTiming[];
  speakers?: Array<{ id: string; label: string }>;
  provider: "deepgram" | "openai" | "fake" | "whisper-local";
  /** True when result will arrive later via webhook (Deepgram callback mode only). */
  async: boolean;
}

export interface TranscriptionProvider {
  transcribe(req: TranscriptionRequest): Promise<TranscriptionResult>;
}

// ─────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────

export async function getTranscriptionProvider(): Promise<TranscriptionProvider> {
  const mode = process.env.PROVIDER_TRANSCRIPTION ?? "fake";
  if (mode === "whisper-local") {
    const { WhisperLocalProvider } = await import("./whisper-local");
    return new WhisperLocalProvider();
  }
  if (mode === "deepgram") {
    const { DeepgramProvider } = await import("./deepgram");
    return new DeepgramProvider();
  }
  if (mode === "openai") {
    const { OpenAIProvider } = await import("./openai-whisper");
    return new OpenAIProvider();
  }
  const { FakeProvider } = await import("./fake");
  return new FakeProvider();
}
