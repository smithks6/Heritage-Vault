import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Mic, Video, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { RecordingRequest, Person, VaultMember } from "@/types";

export const metadata = { title: "Requests" };

type RequestRow = RecordingRequest & {
  subject_person: Pick<Person, "id" | "given_name" | "family_name">;
  requester: Pick<VaultMember, "id"> & {
    person: Pick<Person, "given_name" | "family_name"> | null;
  };
};

const STATUS_STYLE = {
  pending: "badge-amber",
  fulfilled: "badge-green",
  expired: "badge-gray",
  declined: "badge-gray",
};

const STATUS_ICON = {
  pending: <Clock className="w-3.5 h-3.5" />,
  fulfilled: <CheckCircle2 className="w-3.5 h-3.5" />,
  expired: <XCircle className="w-3.5 h-3.5" />,
  declined: <XCircle className="w-3.5 h-3.5" />,
};

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("vault_members")
    .select("id, role, vault_id, person_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/login");

  const { data: requests } = await supabase
    .from("recording_requests")
    .select(`
      *,
      subject_person:people!subject_person_id(id, given_name, family_name),
      requester:vault_members!requester_id(
        id,
        person:people(given_name, family_name)
      )
    `)
    .eq("vault_id", membership.vault_id)
    .order("created_at", { ascending: false });

  const rows: RequestRow[] = (requests ?? []) as RequestRow[];

  const pending = rows.filter((r) => r.status === "pending");
  const completed = rows.filter((r) => r.status !== "pending");

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function RequestCard({ r }: { r: RequestRow }) {
    const requesterName = r.requester?.person
      ? `${r.requester.person.given_name} ${r.requester.person.family_name ?? ""}`
      : "A family member";

    return (
      <div className="card space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/person/${r.subject_person_id}`}
                className="font-medium text-bark-700 hover:text-amber-700 transition-colors"
              >
                {r.subject_person.given_name} {r.subject_person.family_name}
              </Link>
              <span className={`badge ${STATUS_STYLE[r.status]} flex items-center gap-1`}>
                {STATUS_ICON[r.status]}
                {r.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-bark-600 font-medium">&ldquo;{r.subject}&rdquo;</p>
            <p className="mt-0.5 text-xs text-bark-400">
              Requested by {requesterName} · {timeAgo(r.created_at)}
            </p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-parchment-200 flex items-center justify-center">
            {r.medium === "video" ? (
              <Video className="w-4 h-4 text-bark-500" />
            ) : (
              <Mic className="w-4 h-4 text-bark-500" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-bark-700">Requests</h1>
        {pending.length > 0 && (
          <span className="badge badge-amber">{pending.length} pending</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-bark-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No recording requests yet.</p>
          <p className="text-xs mt-1">
            Go to a person&apos;s profile and click &ldquo;Request a recording&rdquo; to ask them
            to share a memory.
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wide mb-3">
                Pending
              </h2>
              <div className="space-y-3">
                {pending.map((r) => <RequestCard key={r.id} r={r} />)}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wide mb-3">
                Completed
              </h2>
              <div className="space-y-3">
                {completed.map((r) => <RequestCard key={r.id} r={r} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
