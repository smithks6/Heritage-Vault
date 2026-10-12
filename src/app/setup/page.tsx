"use client";

/**
 * /setup — first-time vault creation.
 *
 * Shown when an authenticated user has no vault membership.
 * Creates a vault, a person record, and a vault_member admin row via POST /api/setup.
 */

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Archive } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [vaultName, setVaultName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vault_name: vaultName,
        given_name: givenName,
        family_name: familyName || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/tree");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-parchment-100">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bark-600 text-parchment-50 mb-2">
            <Archive className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl text-bark-700">Create your Vault</h1>
          <p className="text-sm text-bark-400">
            Your family's memories live here. You can invite others after setup.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-bark-600 mb-1.5">
              Family vault name
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. The Burchfield Family"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1.5">
                Your first name
              </label>
              <input
                className="input"
                type="text"
                placeholder="First"
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bark-600 mb-1.5">
                Last name
              </label>
              <input
                className="input"
                type="text"
                placeholder="Last"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating vault…
              </>
            ) : (
              "Create vault"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-bark-300">
          You'll be the vault administrator. Additional family members can be
          added from the tree view.
        </p>
      </div>
    </div>
  );
}
