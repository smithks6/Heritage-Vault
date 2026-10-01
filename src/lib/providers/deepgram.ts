import type { TranscriptionProvider, TranscriptionRequest, TranscriptionResult } from "./transcription";

export class DeepgramProvider implements TranscriptionProvider {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY ?? "";
    if (!this.apiKey) throw new Error("DEEPGRAM_API_KEY is not set");
  }

  async transcribe(req: TranscriptionRequest): Promise<TranscriptionResult> {
    const callbackUrl = req.callbackUrl ?? process.env.DEEPGRAM_CALLBACK_URL;

    const params = new URLSearchParams({
      model: "nova-2",
      punctuate: "true",
      diarize: "true",
      utterances: "true",
      smart_format: "true",
      // Round-trip the asset ID through Deepgram metadata
    });

    if (callbackUrl) {
      params.set("callback", callbackUrl);
    }

    const body = JSON.stringify({ url: req.mediaUrl });

    const res = await fetch(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
          // Pass asset ID in custom header so the callback can identify the job
          "X-Heritage-Asset-Id": req.assetId,
        },
        body,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Deepgram error ${res.status}: ${text}`);
    }

    // Callback mode — Deepgram will POST the result later
    if (callbackUrl) {
      return {
        fullText: "",
        wordTimings: [],
        provider: "deepgram",
        async: true,
      };
    }

    // Synchronous response (short files only — < ~10 min)
    const data = await res.json();
    return parseDeepgramResponse(data);
  }
}

export function parseDeepgramResponse(data: unknown): TranscriptionResult {
  const d = data as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string;
          words?: Array<{
            word: string;
            start: number;
            end: number;
            confidence: number;
            speaker?: number;
          }>;
        }>;
      }>;
    };
  };

  const alt = d?.results?.channels?.[0]?.alternatives?.[0];
  const fullText = alt?.transcript ?? "";
  const wordTimings = (alt?.words ?? []).map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
    speaker: w.speaker !== undefined ? `speaker_${w.speaker}` : undefined,
  }));

  const speakerIds = [
    ...new Set(wordTimings.map((w) => w.speaker).filter(Boolean) as string[]),
  ];
  const speakers = speakerIds.map((id, i) => ({ id, label: `Speaker ${i + 1}` }));

  return { fullText, wordTimings, speakers, provider: "deepgram", async: false };
}
