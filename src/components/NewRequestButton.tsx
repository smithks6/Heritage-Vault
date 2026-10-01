"use client";

import { useState } from "react";
import { Plus, X, Mic, Video, Copy, CheckCheck, Loader2 } from "lucide-react";

interface Props {
  personId: string;
  personName: string;
  memberId: string;
}

export default function NewRequestButton({ personId, personName, memberId }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [medium, setMedium] = useState<"audio" | "video">("audio");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_person_id: personId, subject, medium }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Could not create request. Please try again.");
      return;
    }
    const data = await res.json();
    setInviteLink(data.invite_link);
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function reset() {
    setOpen(false);
    setSubject("");
    setMedium("audio");
    setInviteLink(null);
    setCopied(false);
    setError(null);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        <Plus className="w-4 h-4" />
        Request a recording
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && reset()}
        >
          <div className="card w-full max-w-md relative">
            <button
              onClick={reset}
              className="absolute top-3 right-3 btn-ghost px-2 py-1.5 text-bark-400"
            >
              <X className="w-4 h-4" />
            </button>

            {inviteLink ? (
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-bark-700">Request created!</h3>
                <p className="text-sm text-bark-500">
                  Share this link with <strong>{personName}</strong>. When they click it, they can
                  record directly from their phone or browser — no account needed.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="input text-xs font-mono"
                    onFocus={(e) => e.target.select()}
                  />
                  <button onClick={copyLink} className="btn-primary flex-shrink-0 px-3">
                    {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={reset} className="btn-ghost w-full justify-center text-sm">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h3 className="font-serif text-lg text-bark-700">
                  Ask {personName} to record a memory
                </h3>

                <div>
                  <label className="block text-sm font-medium text-bark-600 mb-1.5">
                    What should they talk about?
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Your childhood on the farm"
                    className="input"
                    required
                    autoFocus
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-bark-600 mb-2">
                    Recording format
                  </label>
                  <div className="flex gap-2">
                    {(["audio", "video"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMedium(m)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          medium === m
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-parchment-300 text-bark-500 hover:border-bark-400"
                        }`}
                      >
                        {m === "audio" ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        {m === "audio" ? "Audio" : "Video"}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !subject.trim()}
                  className="btn-primary w-full justify-center"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create request & get link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
