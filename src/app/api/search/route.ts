/**
 * GET /api/search?q=&vault_id=
 *
 * Full-text search over transcripts using Postgres tsvector.
 * Returns media assets with a snippet of matched text.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("vault_members")
    .select("vault_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json([]);
  }

  // Use the search_transcripts RPC (defined in a future migration or
  // handled client-side via ilike as a fallback)
  const { data, error } = await supabase.rpc("search_transcripts", {
    vault: membership.vault_id,
    query: q,
  });

  if (error) {
    // Fallback: simple ilike on full_text joined via media_assets
    const { data: fallback } = await supabase
      .from("transcripts")
      .select(`
        media_asset_id,
        full_text,
        media_assets!inner(
          id, title, recorded_at, mime_type, duration_seconds, vault_id,
          person:people(id, given_name, family_name)
        )
      `)
      .ilike("full_text", `%${q}%`)
      .eq("media_assets.vault_id", membership.vault_id)
      .limit(20);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (fallback ?? []).map((row: any) => {
      const text = row.full_text ?? "";
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 60);
      const end = Math.min(text.length, idx + q.length + 60);
      const snippet = (start > 0 ? "…" : "") +
        text.slice(start, end).replace(
          new RegExp(`(${q})`, "gi"),
          "<mark>$1</mark>"
        ) +
        (end < text.length ? "…" : "");

      return {
        id: row.media_assets.id,
        title: row.media_assets.title,
        recorded_at: row.media_assets.recorded_at,
        mime_type: row.media_assets.mime_type,
        duration_seconds: row.media_assets.duration_seconds,
        person: row.media_assets.person,
        snippet,
      };
    });

    return NextResponse.json(results);
  }

  return NextResponse.json(data ?? []);
}
