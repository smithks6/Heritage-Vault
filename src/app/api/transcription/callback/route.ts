/**
 * POST /api/transcription/callback
 *
 * Deepgram calls this URL when async transcription is complete.
 * Parses the Deepgram webhook body and writes the transcript to Supabase.
 */

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseDeepgramResponse } from "@/lib/providers/deepgram";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Length-safe constant-time comparison. */
function secretMatches(incoming: string, configured: string): boolean {
  const a = Buffer.from(incoming);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  // This handler writes with the service-role client, which bypasses RLS, so
  // it must never be reachable unauthenticated — regardless of which
  // transcription provider is configured. Fail closed when no secret is set.
  const configuredSecret = process.env.DEEPGRAM_WEBHOOK_SECRET;
  if (!configuredSecret) {
    console.error("[callback] DEEPGRAM_WEBHOOK_SECRET is not set; refusing the request");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const incomingSecret = req.headers.get("x-heritage-webhook-secret");
  if (!incomingSecret || !secretMatches(incomingSecret, configuredSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Deepgram sends the asset ID in a custom header (set when initiating the request)
  const assetId = req.headers.get("x-heritage-asset-id");
  if (!assetId) {
    return NextResponse.json({ error: "Missing asset ID header" }, { status: 400 });
  }
  if (!UUID_RE.test(assetId)) {
    return NextResponse.json({ error: "Malformed asset ID header" }, { status: 400 });
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
