/**
 * POST /api/people
 *
 * Creates a new person in the caller's vault with an optional family connection:
 *   - standalone: no relationship
 *   - partner_of: creates a family_unit between the new person and an existing one
 *   - child_of: adds the new person as a child of an existing family_unit
 *
 * Body:
 *   given_name        string  required
 *   family_name       string  optional
 *   birth_year        number  optional
 *   death_year        number  optional
 *   is_deceased       boolean optional
 *   tier              "member" | "light_contributor" | "remembered"  default "remembered"
 *   bio               string  optional
 *   relationship      optional:
 *     { type: "partner_of", person_id: string, marriage_year?: number }
 *     { type: "child_of",   unit_id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: membership } = await supabase
    .from("vault_members")
    .select("vault_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a vault member" }, { status: 403 });

  const body = await req.json();
  const {
    given_name,
    family_name,
    birth_year,
    death_year,
    is_deceased,
    tier = "remembered",
    bio,
    relationship,
  } = body as {
    given_name: string;
    family_name?: string;
    birth_year?: number;
    death_year?: number;
    is_deceased?: boolean;
    tier?: string;
    bio?: string;
    relationship?:
      | { type: "partner_of"; person_id: string; marriage_year?: number }
      | { type: "child_of"; unit_id: string };
  };

  if (!given_name?.trim()) {
    return NextResponse.json({ error: "given_name is required" }, { status: 400 });
  }

  const svc = createServiceClient();
  const vaultId = membership.vault_id;

  // Create the person
  const { data: person, error: personErr } = await svc
    .from("people")
    .insert({
      vault_id: vaultId,
      given_name: given_name.trim(),
      family_name: family_name?.trim() ?? null,
      birth_year: birth_year ?? null,
      death_year: death_year ?? null,
      is_deceased: is_deceased ?? (death_year ? true : false),
      tier,
      bio: bio?.trim() ?? null,
    })
    .select("id")
    .single();

  if (personErr || !person) {
    console.error(personErr);
    return NextResponse.json({ error: "Could not create person" }, { status: 500 });
  }

  // Handle relationship
  if (relationship?.type === "partner_of") {
    // Create a new family unit between the two people
    const { data: unit, error: unitErr } = await svc
      .from("family_units")
      .insert({
        vault_id: vaultId,
        marriage_year: relationship.marriage_year ?? null,
      })
      .select("id")
      .single();

    if (unitErr || !unit) {
      return NextResponse.json({ error: "Could not create family unit" }, { status: 500 });
    }

    const { error: partnersErr } = await svc.from("family_partners").insert([
      { family_unit_id: unit.id, person_id: relationship.person_id },
      { family_unit_id: unit.id, person_id: person.id },
    ]);

    if (partnersErr) {
      return NextResponse.json({ error: "Could not link partners" }, { status: 500 });
    }
  } else if (relationship?.type === "child_of") {
    const { error: childErr } = await svc.from("family_children").insert({
      family_unit_id: relationship.unit_id,
      person_id: person.id,
    });

    if (childErr) {
      return NextResponse.json({ error: "Could not add child to family unit" }, { status: 500 });
    }
  }

  return NextResponse.json({ person_id: person.id });
}
