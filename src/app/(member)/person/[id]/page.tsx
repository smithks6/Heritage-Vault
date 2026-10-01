import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Mic, Video, Clock, ChevronRight, Plus, User } from "lucide-react";
import NewRequestButton from "@/components/NewRequestButton";
import type { MediaAsset, Person } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("given_name, family_name").eq("id", id).single();
  if (!data) return { title: "Person" };
  return { title: `${data.given_name} ${data.family_name ?? ""}`.trim() };
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: person } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .single();

  if (!person) notFound();

  const { data: recordings } = await supabase
    .from("media_assets")
    .select("*")
    .eq("person_id", id)
    .order("recorded_at", { ascending: false });

  const assets: MediaAsset[] = recordings ?? [];

  const { data: membership } = await supabase
    .from("vault_members")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  function formatDuration(seconds: number | null) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Person header */}
      <div className="card flex gap-4 items-start">
        <div className="w-16 h-16 rounded-full bg-parchment-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-bark-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl text-bark-700">
            {person.given_name} {person.family_name}
          </h1>
          <p className="text-sm text-bark-400 mt-0.5">
            {person.birth_year && (
              <span>b. {person.birth_year}</span>
            )}
            {person.birth_year && person.death_year && <span> – </span>}
            {person.death_year && (
              <span>d. {person.death_year}</span>
            )}
          </p>
          {person.bio && (
            <p className="mt-2 text-sm text-bark-600 leading-relaxed">{person.bio}</p>
          )}
        </div>
      </div>

      {/* Recordings header + request button */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-bark-600">
          Recordings
          {assets.length > 0 && (
            <span className="ml-2 text-sm font-sans font-normal text-bark-400">
              ({assets.length})
            </span>
          )}
        </h2>
        {membership && !person.is_deceased && (
          <NewRequestButton
            personId={person.id}
            personName={`${person.given_name} ${person.family_name ?? ""}`.trim()}
            memberId={membership.id}
          />
        )}
      </div>

      {/* Recordings list */}
      {assets.length === 0 ? (
        <div className="text-center py-12 text-bark-400">
          <Mic className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No recordings yet.</p>
          {membership && !person.is_deceased && (
            <p className="text-xs mt-1">
              Send a request to ask {person.given_name} to record a memory.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {assets.map((asset) => (
            <li key={asset.id}>
              <Link
                href={`/recording/${asset.id}`}
                className="card flex items-center gap-4 hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  asset.mime_type.startsWith("video")
                    ? "bg-bark-100 text-bark-600"
                    : "bg-amber-50 text-amber-600"
                }`}>
                  {asset.mime_type.startsWith("video") ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-bark-700 truncate">
                    {asset.title ?? "Untitled recording"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {asset.recorded_at && (
                      <span className="text-xs text-bark-400">
                        {new Date(asset.recorded_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {asset.duration_seconds && (
                      <span className="flex items-center gap-1 text-xs text-bark-400">
                        <Clock className="w-3 h-3" />
                        {formatDuration(asset.duration_seconds)}
                      </span>
                    )}
                    <span className={`badge ${
                      asset.transcription_status === "done"
                        ? "badge-green"
                        : asset.transcription_status === "processing"
                        ? "badge-amber"
                        : "badge-gray"
                    }`}>
                      {asset.transcription_status === "done"
                        ? "Transcript ready"
                        : asset.transcription_status === "processing"
                        ? "Transcribing…"
                        : "No transcript"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-bark-300 group-hover:text-bark-500 flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
