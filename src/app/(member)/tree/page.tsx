import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FamilyTreeView from "@/components/FamilyTree";
import AddPersonButton from "@/components/AddPersonButton";
import type { FamilyGraph } from "@/types";

export const metadata = { title: "Family Tree" };

export default async function TreePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get vault membership
  const { data: membership } = await supabase
    .from("vault_members")
    .select("vault_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="font-serif text-2xl text-bark-600 mb-2">No vault yet</h2>
        <p className="text-bark-400 text-sm max-w-sm">
          You are not a member of any vault. Ask your family admin to add you.
        </p>
      </div>
    );
  }

  const vaultId = membership.vault_id;

  // Load full family graph
  const [peopleRes, unitsRes, partnersRes, childrenRes, countsRes] =
    await Promise.all([
      supabase.from("people").select("*").eq("vault_id", vaultId),
      supabase.from("family_units").select("*").eq("vault_id", vaultId),
      supabase.from("family_partners").select("*"),
      supabase.from("family_children").select("*"),
      supabase
        .from("media_assets")
        .select("person_id")
        .eq("vault_id", vaultId),
    ]);

  const people = peopleRes.data ?? [];
  const units = unitsRes.data ?? [];
  const partners = partnersRes.data ?? [];
  const children = childrenRes.data ?? [];
  const assets = countsRes.data ?? [];

  // Build recordings-per-person count
  const recordingsCount: Record<string, number> = {};
  for (const a of assets) {
    recordingsCount[a.person_id] = (recordingsCount[a.person_id] ?? 0) + 1;
  }

  const graph: FamilyGraph = {
    nodes: people.map((p) => ({
      id: p.id,
      person: p,
      recordings_count: recordingsCount[p.id] ?? 0,
    })),
    units: units.map((u) => ({
      id: u.id,
      marriage_year: u.marriage_year,
      partners: partners
        .filter((p) => p.family_unit_id === u.id)
        .map((p) => p.person_id),
      children: children
        .filter((c) => c.family_unit_id === u.id)
        .map((c) => c.person_id),
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-bark-700">Family Tree</h1>
        <div className="flex items-center gap-2">
          <span className="badge badge-gray">{people.length} people</span>
          <AddPersonButton graph={graph} />
        </div>
      </div>
      <FamilyTreeView graph={graph} />
    </div>
  );
}
