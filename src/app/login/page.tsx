"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
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
            <h2 className="font-serif text-xl text-bark-700 mb-1">Sign in</h2>
            <p className="text-sm text-bark-400 mb-5">
              Enter your email and we&apos;ll send you a sign-in link.
            </p>

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

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full justify-center"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
