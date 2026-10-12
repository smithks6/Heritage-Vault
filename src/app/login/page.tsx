"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Mail, ArrowRight, Loader2, KeyRound } from "lucide-react";

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        router.push("/tree");
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) setError(error.message);
      else setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-parchment-100">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-bark-600 flex items-center justify-center shadow-lg">
          <BookOpen className="w-8 h-8 text-parchment-100" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-serif text-bark-700">Heritage Vault</h1>
        <p className="text-bark-400 text-sm text-center max-w-xs">
          Preserve the voices and stories of the people who shaped your family.
        </p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-sm">
        {sent ? (
          <div className="text-center space-y-3 py-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="font-serif text-xl text-bark-700">Check your email</h2>
            <p className="text-sm text-bark-500">
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="btn-ghost text-xs mt-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-parchment-300 p-0.5 mb-5 bg-parchment-100">
              <button
                type="button"
                onClick={() => { setMode("password"); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all ${
                  mode === "password"
                    ? "bg-white text-bark-700 shadow-sm"
                    : "text-bark-400 hover:text-bark-600"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Password
              </button>
              <button
                type="button"
                onClick={() => { setMode("magic"); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all ${
                  mode === "magic"
                    ? "bg-white text-bark-700 shadow-sm"
                    : "text-bark-400 hover:text-bark-600"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Magic link
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-bark-600 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                />
              </div>

              {mode === "password" && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-bark-600 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email || (mode === "password" && !password)}
                className="btn-primary w-full justify-center"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "password" ? (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Send magic link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-bark-400 text-center">
        Are you a family member with a recording link?{" "}
        <span className="text-bark-500">Use the link that was sent to you.</span>
      </p>
    </div>
  );
}
