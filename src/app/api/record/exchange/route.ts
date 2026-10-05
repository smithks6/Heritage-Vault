/**
 * GET /api/record/exchange?t={token}
 *
 * Validates the contributor token from the URL, sets the signed httpOnly
 * cookie, then redirects to /record/{token} so the page can render without
 * needing to set cookies itself (which is not allowed in Server Components).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { signSession, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("contributor_tokens")
    .select("*, person:people(*), request:recording_requests(*)")
    .eq("token", token)
    .is("revoked_at", null)
    .single();

  const now = new Date();

  // Build the destination URL (back to the record page)
  const dest = new URL(`/record/${token}`, req.url);

  if (!tokenRow || new Date(tokenRow.expires_at) < now) {
    // Let the page handle the invalid/expired state
    return NextResponse.redirect(dest);
  }

  const session = {
    token_id: tokenRow.id,
    person_id: tokenRow.person_id,
    vault_id: tokenRow.vault_id,
    request_id: tokenRow.request_id ?? null,
    expires_at: tokenRow.expires_at,
  };

  const signed = await signSession(session);

  // Increment use count
  await supabase
    .from("contributor_tokens")
    .update({ used_count: tokenRow.used_count + 1 })
    .eq("id", tokenRow.id);

  const response = NextResponse.redirect(dest);
  response.cookies.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
