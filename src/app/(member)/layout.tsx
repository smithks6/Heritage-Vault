import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MemberNav from "@/components/MemberNav";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch vault membership
  const { data: membership } = await supabase
    .from("vault_members")
    .select("*, vault:vaults(*)")
    .eq("user_id", user.id)
    .single();

  // First-time user: no vault yet → onboarding
  if (!membership) redirect("/setup");

  return (
    <div className="min-h-screen flex flex-col">
      <MemberNav user={user} membership={membership} />
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
