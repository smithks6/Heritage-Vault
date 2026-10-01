/**
 * POST /api/upload/complete
 *
 * Called by the browser after a successful direct-upload to Supabase storage.
 * Updates the media_asset with duration, title, and size, then triggers
 * transcription by setting transcription_status = 'processing'.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/tokens";
import { createServiceClient } from "@/lib/supabase/server";
import { getTranscriptionProvider } from "@/lib/providers/transcription";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookieValue) {
    return NextResponse.json({ error: "No contributor session" }, { status: 401 });
  }
  const session = await verifySession(cookieValue);
  if (!session) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const body = await req.json();
  const { asset_id, title, duration_seconds, size_bytes, recorded_at } = body as {
    asset_id: string;
    title?: string;
    duration_seconds?: number;
    size_bytes?: number;
    recorded_at?: string;
  };

  if (!asset_id) {
    return NextResponse.json({ error: "asset_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Update asset metadata
  const { data: asset, error: updateErr } = await supabase
    .from("media_assets")
    .update({
      title: title ?? null,
      duration_seconds: duration_seconds ?? null,
      size_bytes: size_bytes ?? null,
      recorded_at: recorded_at ?? new Date().toISOString(),
      transcription_status: "processing",
    })
    .eq("id", asset_id)
    .eq("person_id", session.person_id) // security: only own asset
    .select("storage_path, mime_type")
    .single();

  if (updateErr || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Fulfill the request if one was attached
  if (session.request_id) {
    await supabase
      .from("recording_requests")
      .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
      .eq("id", session.request_id);
  }

  // Trigger transcription (fire-and-forget for async providers)
  triggerTranscription(asset_id, asset.storage_path, asset.mime_type, supabase).catch(
    (err) => console.error("Transcription trigger error:", err)
  );

  return NextResponse.json({ ok: true, asset_id });
}

async function triggerTranscription(
  assetId: string,
  storagePath: string,
  mimeType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // Get a signed URL Deepgram can fetch from
  const { data: signed } = await supabase.storage
    .from("vault-media")
    .createSignedUrl(storagePath, 7200);

  if (!signed?.signedUrl) {
    console.error("Could not create signed URL for transcription");
    await supabase
      .from("media_assets")
      .update({ transcription_status: "failed" })
      .eq("id", assetId);
    return;
  }

  try {
    const provider = await getTranscriptionProvider();
    const result = await provider.transcribe({
      mediaUrl: signed.signedUrl,
      mimeType,
      assetId,
      callbackUrl: process.env.DEEPGRAM_CALLBACK_URL,
    });

    if (!result.async) {
      // Synchronous result — save immediately
      await supabase.from("transcripts").upsert({
        media_asset_id: assetId,
        provider: result.provider,
        full_text: result.fullText,
        word_timings: result.wordTimings,
        speakers: result.speakers ?? null,
      });
      await supabase
        .from("media_assets")
        .update({ transcription_status: "done" })
        .eq("id", assetId);
    }
    // Async: Deepgram will POST to /api/transcription/callback
  } catch (err) {
    console.error("Transcription error:", err);
    await supabase
      .from("media_assets")
      .update({ transcription_status: "failed" })
      .eq("id", assetId);
  }
}
