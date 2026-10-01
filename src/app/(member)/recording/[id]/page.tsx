import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User } from "lucide-react";
import TranscriptPlayer from "@/components/playback/TranscriptPlayer";
import type { RecordingWithTranscript } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("media_assets").select("title").eq("id", id).single();
  return { title: data?.title ?? "Recording" };
}

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: asset } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .single();

  if (!asset) notFound();

  const [{ data: transcript }, { data: person }] = await Promise.all([
    supabase.from("transcripts").select("*").eq("media_asset_id", id).single(),
    supabase.from("people").select("*").eq("id", asset.person_id).single(),
  ]);

  // Get a signed URL for playback (1 hour)
  const { data: signedUrlData } = await supabase.storage
    .from("vault-media")
    .createSignedUrl(asset.storage_path, 3600);

  const playbackUrl = signedUrlData?.signedUrl ?? null;

  const recording: RecordingWithTranscript = {
    ...asset,
    transcript: transcript ?? null,
    person: person!,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back link */}
      <Link
        href={`/person/${asset.person_id}`}
        className="inline-flex items-center gap-1 text-sm text-bark-400 hover:text-bark-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {person?.given_name ?? "person"}
      </Link>

      {/* Recording header */}
      <div className="card space-y-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-parchment-300 flex items-center justify-center flex-shrink-0">
            {person?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-bark-400" />
            )}
          </div>
          <div>
            <h1 className="font-serif text-xl text-bark-700">
              {asset.title ?? "Untitled recording"}
            </h1>
            <p className="text-sm text-bark-400">
              {person && `${person.given_name} ${person.family_name ?? ""}`}
              {asset.recorded_at && (
                <span className="ml-2">
                  ·{" "}
                  {new Date(asset.recorded_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Player + transcript */}
      {playbackUrl ? (
        <TranscriptPlayer
          playbackUrl={playbackUrl}
          mimeType={asset.mime_type}
          transcript={recording.transcript}
          durationSeconds={asset.duration_seconds}
        />
      ) : (
        <div className="card text-center py-8 text-bark-400 text-sm">
          Media unavailable — storage link could not be generated.
        </div>
      )}
    </div>
  );
}
