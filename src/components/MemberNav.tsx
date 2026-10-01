"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, TreePine, Search, Bell, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  membership: {
    role: string;
    vault: { name: string; id: string } | null;
  } | null;
}

const NAV_ITEMS = [
  { href: "/tree", label: "Family Tree", icon: TreePine },
  { href: "/search", label: "Search", icon: Search },
  { href: "/requests", label: "Requests", icon: Bell },
];

export default function MemberNav({ user, membership }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-parchment-50 border-b border-parchment-300 shadow-sm">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center gap-4">
          {/* Logo */}
          <Link href="/tree" className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 rounded-lg bg-bark-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-parchment-100" strokeWidth={1.5} />
            </div>
            <span className="font-serif text-lg text-bark-700 hidden sm:block">
              {membership?.vault?.name ?? "Heritage Vault"}
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-bark-600 text-parchment-50"
                      : "text-bark-500 hover:bg-parchment-200 hover:text-bark-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User + sign out */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-bark-400 hidden md:block truncate max-w-[160px]">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="btn-ghost px-2 py-1.5 text-bark-400 hover:text-bark-700"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
