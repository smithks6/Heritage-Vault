/**
 * POST /api/setup
 *
 * Creates the initial vault for an authenticated user who has no membership yet.
 * Uses the service role so it can insert vault_members without an existing RLS grant.
 *
 * Body: { vault_name, given_name, family_name }
 * Returns: { vault_id }
 *
 * Idempotency: if the user already has a vault_members row the request is rejected.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated Supabase user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Guard: do not let an already-joined user call setup again
  const { data: existing } = await supabase
    .from("vault_members")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (existing) {
    return NextResponse.json({ error: "Already a vault member" }, { status: 409 });
  }

  const body = await req.json();
  const { vault_name, given_name, family_name } = body as {
    vault_name: string;
    given_name: string;
    family_name?: string;
  };

  if (!vault_name?.trim() || !given_name?.trim()) {
    return NextResponse.json({ error: "vault_name and given_name are required" }, { status: 400 });
  }

  const svc = createServiceClient();

  // Create vault
  const slug = vault_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const { data: vault, error: vaultErr } = await svc
    .from("vaults")
    .insert({ name: vault_name.trim(), slug: `${slug}-${Date.now()}` })
    .select("id")
    .single();

  if (vaultErr || !vault) {
    console.error("vault insert error:", vaultErr);
    return NextResponse.json({ error: "Could not create vault" }, { status: 500 });
  }

  // Create a person record for this user
  const { data: person, error: personErr } = await svc
    .from("people")
    .insert({
      vault_id: vault.id,
      given_name: given_name.trim(),
      family_name: family_name?.trim() ?? null,
      tier: "member",
    })
    .select("id")
    .single();

  if (personErr || !person) {
    console.error("person insert error:", personErr);
    return NextResponse.json({ error: "Could not create person record" }, { status: 500 });
  }

  // Make this user the vault admin
  const { error: memberErr } = await svc
    .from("vault_members")
    .insert({
      vault_id: vault.id,
      user_id: user.id,
      person_id: person.id,
      role: "admin",
    });

  if (memberErr) {
    console.error("vault_members insert error:", memberErr);
    return NextResponse.json({ error: "Could not add vault member" }, { status: 500 });
  }

  return NextResponse.json({ vault_id: vault.id });
}
