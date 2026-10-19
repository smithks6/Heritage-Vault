/**
 * Local Whisper provider — zero cost, zero API keys.
 *
 * Calls a locally running whisper-asr-webservice instance.
 * Start the service with Docker (CPU, no GPU required):
 *
 *   docker compose up whisper
 *
 * Or manually:
 *
 *   docker run -d -p 9000:9000 \
 *     -e ASR_MODEL=base \
 *     -v whisper-models:/root/.cache/whisper \
 *     onerahmet/openai-whisper-asr-webservice:latest-cpu
 *
 * Env vars:
 *   WHISPER_LOCAL_URL — base URL of the service (default: http://localhost:9000)
 *
 * Model sizes (set ASR_MODEL in docker-compose.yml):
 *   tiny   ~39 MB   fastest, least accurate
 *   base   ~74 MB   good for development
 *   small  ~244 MB  recommended for production
 *   medium ~769 MB  better quality, needs ~4 GB RAM
 */

import type {
  TranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResult,
} from "./transcription";

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
}

interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
}

export class WhisperLocalProvider implements TranscriptionProvider {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = (
      process.env.WHISPER_LOCAL_URL ?? "http://localhost:9000"
    ).replace(/\/$/, "");
  }

  async transcribe(req: TranscriptionRequest): Promise<TranscriptionResult> {
    // 1. Download the media from the signed storage URL
    const mediaRes = await fetch(req.mediaUrl);
    if (!mediaRes.ok) {
      throw new Error(`Could not fetch media from storage: ${mediaRes.status}`);
    }
    const blob = await mediaRes.blob();
    const ext = mimeToExt(req.mimeType);

    // 2. POST to the local Whisper service
    const form = new FormData();
    form.append("audio_file", blob, `recording.${ext}`);

    const url = new URL(`${this.baseUrl}/asr`);
    url.searchParams.set("task", "transcribe");
    url.searchParams.set("word_timestamps", "true");
    url.searchParams.set("output", "json");

    const res = await fetch(url.toString(), { method: "POST", body: form });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Whisper service error ${res.status}: ${body}`);
    }

    const data: WhisperResponse = await res.json();

    // Flatten word timings from all segments
    const wordTimings = data.segments.flatMap((seg) =>
      (seg.words ?? []).map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.probability,
      }))
    );

    return {
      fullText: data.text.trim(),
      wordTimings,
      provider: "whisper-local",
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
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return map[mime] ?? "mp4";
}
