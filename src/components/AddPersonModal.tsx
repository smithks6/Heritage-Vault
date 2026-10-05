"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, UserPlus } from "lucide-react";
import type { FamilyGraph } from "@/types";

interface Props {
  graph: FamilyGraph;
  onClose: () => void;
}

type RelType = "standalone" | "partner_of" | "child_of";

export default function AddPersonModal({ graph, onClose }: Props) {
  const router = useRouter();

  // Person fields
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [tier, setTier] = useState<"remembered" | "member" | "light_contributor">("remembered");
  const [bio, setBio] = useState("");

  // Relationship
  const [relType, setRelType] = useState<RelType>("standalone");
  const [partnerId, setPartnerId] = useState("");
  const [marriageYear, setMarriageYear] = useState("");
  const [unitId, setUnitId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Family units that have at least 2 partners (formed couples)
  const formedUnits = graph.units.filter((u) => u.partners.length >= 2);

  function unitLabel(unitId: string) {
    const unit = graph.units.find((u) => u.id === unitId);
    if (!unit) return unitId;
    const names = unit.partners
      .map((pid) => {
        const node = graph.nodes.find((n) => n.id === pid);
        return node ? `${node.person.given_name} ${node.person.family_name ?? ""}`.trim() : pid;
      })
      .join(" & ");
    return unit.marriage_year ? `${names} (m. ${unit.marriage_year})` : names;
  }

  function personLabel(pid: string) {
    const node = graph.nodes.find((n) => n.id === pid);
    if (!node) return pid;
    const years = [node.person.birth_year, node.person.death_year].filter(Boolean).join("–");
    const name = `${node.person.given_name} ${node.person.family_name ?? ""}`.trim();
    return years ? `${name} (${years})` : name;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const relationship =
      relType === "partner_of" && partnerId
        ? { type: "partner_of" as const, person_id: partnerId, marriage_year: marriageYear ? parseInt(marriageYear) : undefined }
        : relType === "child_of" && unitId
        ? { type: "child_of" as const, unit_id: unitId }
        : undefined;

    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        given_name: givenName,
        family_name: familyName || undefined,
        birth_year: birthYear ? parseInt(birthYear) : undefined,
        death_year: deathYear ? parseInt(deathYear) : undefined,
        is_deceased: !!deathYear,
        tier,
        bio: bio || undefined,
        relationship,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 btn-ghost px-2 py-1.5 text-bark-400"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-serif text-xl text-bark-700 mb-5 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-bark-500" />
          Add a family member
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1.5">First name *</label>
              <input className="input" value={givenName} onChange={(e) => setGivenName(e.target.value)} required placeholder="First" />
            </div>
            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1.5">Last name</label>
              <input className="input" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Last" />
            </div>
          </div>

          {/* Years */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1.5">Birth year</label>
              <input className="input" type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="e.g. 1942" min={1800} max={2025} />
            </div>
            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1.5">Death year</label>
              <input className="input" type="number" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} placeholder="Leave blank if living" min={1800} max={2025} />
            </div>
          </div>

          {/* Tier */}
          <div>
            <label className="block text-sm font-medium text-bark-600 mb-1.5">Type</label>
            <div className="flex gap-2">
              {([
                { value: "remembered", label: "Remembered" },
                { value: "member", label: "Member" },
                { value: "light_contributor", label: "Contributor" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTier(value)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    tier === value
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-parchment-300 text-bark-500 hover:border-bark-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-bark-400 mt-1">
              Remembered = deceased/absent · Member = has an account · Contributor = recording link only
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-bark-600 mb-1.5">Short bio <span className="font-normal text-bark-400">(optional)</span></label>
            <textarea className="input resize-none" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A sentence or two about this person." maxLength={500} />
          </div>

          {/* Family connection */}
          <div>
            <label className="block text-sm font-medium text-bark-600 mb-1.5">Family connection</label>
            <div className="space-y-2">
              {(["standalone", "partner_of", "child_of"] as RelType[]).map((rt) => (
                <label key={rt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="relType"
                    value={rt}
                    checked={relType === rt}
                    onChange={() => setRelType(rt)}
                    className="accent-amber-600"
                  />
                  <span className="text-sm text-bark-700">
                    {rt === "standalone" && "No connection yet"}
                    {rt === "partner_of" && "Partner / spouse of an existing person"}
                    {rt === "child_of" && "Child of an existing couple"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {relType === "partner_of" && (
            <div className="space-y-3 pl-4 border-l-2 border-amber-200">
              <div>
                <label className="block text-sm font-medium text-bark-600 mb-1.5">Partner with</label>
                <select
                  className="input"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  required={relType === "partner_of"}
                >
                  <option value="">Select a person…</option>
                  {graph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>{personLabel(n.id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-bark-600 mb-1.5">Marriage year <span className="font-normal text-bark-400">(optional)</span></label>
                <input className="input" type="number" value={marriageYear} onChange={(e) => setMarriageYear(e.target.value)} placeholder="e.g. 1965" min={1800} max={2025} />
              </div>
            </div>
          )}

          {relType === "child_of" && (
            <div className="pl-4 border-l-2 border-amber-200">
              <label className="block text-sm font-medium text-bark-600 mb-1.5">Child of</label>
              {formedUnits.length === 0 ? (
                <p className="text-sm text-bark-400 italic">No couples yet — add partners first, then children.</p>
              ) : (
                <select
                  className="input"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  required={relType === "child_of"}
                >
                  <option value="">Select a couple…</option>
                  {formedUnits.map((u) => (
                    <option key={u.id} value={u.id}>{unitLabel(u.id)}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to tree"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
