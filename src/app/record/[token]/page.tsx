import { createServiceClient } from "@/lib/supabase/server";
import { verifySession, COOKIE_NAME } from "@/lib/tokens";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ContributorRecorder from "@/components/recorder/ContributorRecorder";
import { BookOpen } from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = { title: "Record a memory" };

export default async function RecordPage({ params }: Props) {
  const { token } = await params;

  // Check if the contributor session cookie is already set
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;
  const session = cookieValue ? await verifySession(cookieValue) : null;

  // No valid cookie → exchange route sets it and redirects back here
  if (!session) {
    redirect(`/api/record/exchange?t=${token}`);
  }

  // Cookie is valid — load the person + request for the recorder UI
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("contributor_tokens")
    .select("*, person:people(*), request:recording_requests(*)")
    .eq("token", token)
    .is("revoked_at", null)
    .single();

  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    return <InvalidToken reason={!tokenRow ? "not_found" : "expired"} />;
  }

  return (
    <div className="min-h-screen bg-parchment-100 flex flex-col">
      <header className="bg-parchment-50 border-b border-parchment-300 px-4 py-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <div className="w-7 h-7 rounded-lg bg-bark-600 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-parchment-100" strokeWidth={1.5} />
          </div>
          <span className="font-serif text-base text-bark-700">Heritage Vault</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8">
        <div className="w-full max-w-lg">
          <ContributorRecorder
            person={tokenRow.person}
            request={tokenRow.request}
            vaultId={session.vault_id}
          />
        </div>
      </main>
    </div>
  );
}

function InvalidToken({ reason }: { reason: "not_found" | "expired" }) {
  return (
    <div className="min-h-screen bg-parchment-100 flex flex-col items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center space-y-3 py-8">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <BookOpen className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="font-serif text-xl text-bark-700">
          {reason === "expired" ? "This link has expired" : "Link not found"}
        </h1>
        <p className="text-sm text-bark-500">
          {reason === "expired"
            ? "Recording links expire after a set time. Ask the family member who sent this to send a new one."
            : "This link is not valid. Please check the link you received and try again."}
        </p>
      </div>
    </div>
  );
}
