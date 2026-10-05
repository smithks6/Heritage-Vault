/**
 * POST /api/requests — create a new recording request.
 *
 * Authenticated members only. Also generates a contributor token and returns
 * the invite link that can be sent to the subject person.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { subject_person_id, subject, medium, expires_days = 30 } = body as {
    subject_person_id: string;
    subject: string;
    medium: "audio" | "video";
    expires_days?: number;
  };

  if (!subject_person_id || !subject || !medium) {
    return NextResponse.json({ error: "subject_person_id, subject, and medium are required" }, { status: 400 });
  }

  // Get membership
  const { data: membership } = await supabase
    .from("vault_members")
    .select("id, vault_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a vault member" }, { status: 403 });
  }

  const service = createServiceClient();

  // Verify subject person is in the same vault
  const { data: person } = await service
    .from("people")
    .select("id, vault_id")
    .eq("id", subject_person_id)
    .eq("vault_id", membership.vault_id)
    .single();

  if (!person) {
    return NextResponse.json({ error: "Person not found in vault" }, { status: 404 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expires_days);

  // Create the request
  const { data: request, error: reqErr } = await service
    .from("recording_requests")
    .insert({
      vault_id: membership.vault_id,
      requester_id: membership.id,
      subject_person_id,
      subject,
      medium,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (reqErr || !request) {
    console.error(reqErr);
    return NextResponse.json({ error: "Could not create request" }, { status: 500 });
  }

  // Generate contributor token
  const token = generateToken();
  const { error: tokenErr } = await service.from("contributor_tokens").insert({
    token,
    person_id: subject_person_id,
    vault_id: membership.vault_id,
    request_id: request.id,
    expires_at: expiresAt.toISOString(),
  });

  if (tokenErr) {
    console.error(tokenErr);
    return NextResponse.json({ error: "Could not create token" }, { status: 500 });
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.nextUrl.host;
  const appUrl = `${proto}://${host}`;
  const inviteLink = `${appUrl}/record/${token}`;

  return NextResponse.json({
    request_id: request.id,
    invite_link: inviteLink,
  });
}
