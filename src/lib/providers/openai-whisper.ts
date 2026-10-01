/**
 * OpenAI whisper-1 fallback provider.
 *
 * Limitations:
 *  - 25 MB upload cap (~100 s of 720p video)
 *  - Audio files only (not video containers)
 *  - Synchronous only (no callback)
 *  - Word-level timestamps available via verbose_json
 */

import type { TranscriptionProvider, TranscriptionRequest, TranscriptionResult } from "./transcription";

export class OpenAIProvider implements TranscriptionProvider {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? "";
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not set");
  }

  async transcribe(req: TranscriptionRequest): Promise<TranscriptionResult> {
    // Fetch the media from the signed URL (must be < 25 MB)
    const mediaRes = await fetch(req.mediaUrl);
    if (!mediaRes.ok) {
      throw new Error(`Could not fetch media: ${mediaRes.status}`);
    }
    const blob = await mediaRes.blob();

    const form = new FormData();
    form.append("file", blob, `recording.${mimeToExt(req.mimeType)}`);
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI Whisper error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const wordTimings = (data.words ?? []).map(
      (w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })
    );

    return {
      fullText: data.text ?? "",
      wordTimings,
      provider: "openai",
      async: false,
    };
  }
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
  };
  return map[mime] ?? "mp3";
}
