/**
 * POST /api/upload/signed
 *
 * Called by the contributor recorder to get a Supabase signed upload URL.
 * Requires a valid contributor session cookie.
 * Returns: { signed_url, path, asset_id }
 *
 * The browser then PUT-s the blob directly to the signed URL — the media file
 * never passes through our compute. Once the upload completes the browser
 * calls POST /api/upload/complete to create the media_asset row and trigger
 * transcription.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/tokens";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Verify contributor session
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
  const { mime_type, extension } = body as { mime_type: string; extension: string };
  if (!mime_type || !extension) {
    return NextResponse.json({ error: "mime_type and extension required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const path = `${session.vault_id}/${session.person_id}/${Date.now()}.${extension}`;

  // Create a signed upload URL (2-hour validity, browser uploads directly)
  const { data, error } = await supabase.storage
    .from("vault-media")
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("Signed upload URL error:", error);
    return NextResponse.json({ error: "Could not create upload URL" }, { status: 500 });
  }

  // Pre-create the media_asset row so the transcription trigger has it
  const { data: asset, error: assetErr } = await supabase
    .from("media_assets")
    .insert({
      vault_id: session.vault_id,
      person_id: session.person_id,
      request_id: session.request_id,
      storage_path: path,
      mime_type,
      transcription_status: "pending",
    })
    .select("id")
    .single();

  if (assetErr || !asset) {
    console.error("media_assets insert error:", assetErr);
    return NextResponse.json({ error: "Could not create asset record" }, { status: 500 });
  }

  return NextResponse.json({
    signed_url: data.signedUrl,
    path,
    asset_id: asset.id,
  });
}
