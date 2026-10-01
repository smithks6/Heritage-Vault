import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, Mic, Video, Clock, User } from "lucide-react";
import SearchInput from "@/components/SearchInput";

export const metadata = { title: "Search" };

interface SearchResult {
  id: string;
  title: string | null;
  recorded_at: string | null;
  mime_type: string;
  duration_seconds: number | null;
  person: { id: string; given_name: string; family_name: string | null } | null;
  snippet: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("vault_members")
    .select("vault_id")
    .eq("user_id", user.id)
    .single();

  let results: SearchResult[] = [];

  if (q && q.trim().length > 1 && membership) {
    // Full-text search on transcripts + join to media_assets + people
    const { data } = await supabase.rpc("search_transcripts", {
      vault: membership.vault_id,
      query: q.trim(),
    });
    results = (data ?? []) as SearchResult[];
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-serif text-bark-700">Search</h1>

      <SearchInput defaultValue={q} />

      {q && q.trim().length > 1 && (
        <p className="text-sm text-bark-400">
          {results.length === 0
            ? `No results for "${q}"`
            : `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}"`}
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={`/recording/${r.id}`}
                className="card block hover:border-amber-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 text-amber-600 mt-0.5">
                    {r.mime_type.startsWith("video") ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-bark-700 truncate">
                      {r.title ?? "Untitled recording"}
                    </p>
                    {r.person && (
                      <p className="text-xs text-bark-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {r.person.given_name} {r.person.family_name}
                        {r.recorded_at && (
                          <span className="ml-1">
                            · {new Date(r.recorded_at).getFullYear()}
                          </span>
                        )}
                        {r.duration_seconds && (
                          <span className="flex items-center gap-0.5 ml-1">
                            · <Clock className="w-3 h-3" /> {formatDuration(r.duration_seconds)}
                          </span>
                        )}
                      </p>
                    )}
                    {/* Matched snippet with query highlight */}
                    <p
                      className="mt-1.5 text-sm text-bark-600 leading-relaxed line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!q && (
        <div className="text-center py-16 text-bark-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search across transcripts, names, and topics.</p>
        </div>
      )}
    </div>
  );
}
