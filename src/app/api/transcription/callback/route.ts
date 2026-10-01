/**
 * POST /api/transcription/callback
 *
 * Deepgram calls this URL when async transcription is complete.
 * Parses the Deepgram webhook body and writes the transcript to Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseDeepgramResponse } from "@/lib/providers/deepgram";

export async function POST(req: NextRequest) {
  // Simple secret check (add DEEPGRAM_WEBHOOK_SECRET to .env for production)
  const secret = req.headers.get("x-heritage-webhook-secret");
  if (
    process.env.DEEPGRAM_WEBHOOK_SECRET &&
    secret !== process.env.DEEPGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Deepgram sends the asset ID in a custom header (set when initiating the request)
  const assetId = req.headers.get("x-heritage-asset-id");
  if (!assetId) {
    return NextResponse.json({ error: "Missing asset ID header" }, { status: 400 });
  }

  const data = await req.json();

  try {
    const result = parseDeepgramResponse(data);
    const supabase = createServiceClient();

    await supabase.from("transcripts").upsert({
      media_asset_id: assetId,
      provider: "deepgram",
      full_text: result.fullText,
      word_timings: result.wordTimings,
      speakers: result.speakers ?? null,
    });

    await supabase
      .from("media_assets")
      .update({ transcription_status: "done" })
      .eq("id", assetId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Callback parse error:", err);
    const supabase = createServiceClient();
    await supabase
      .from("media_assets")
      .update({ transcription_status: "failed" })
      .eq("id", assetId);
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
