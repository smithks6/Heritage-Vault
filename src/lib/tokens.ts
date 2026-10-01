/**
 * Contributor token utilities.
 *
 * Tokens are 32 random bytes, hex-encoded (64 chars).
 * The URL token is exchanged server-side for a short-lived signed httpOnly
 * cookie that carries the ContributorSession payload.
 *
 * The cookie is signed with TOKEN_COOKIE_SECRET via HMAC-SHA256 so it cannot
 * be forged, but does not encrypt — treat ContributorSession as semi-public.
 */

import type { ContributorSession } from "@/types";

const COOKIE_NAME = "hv_contributor";
const COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

// ─────────────────────────────────────────────
// Token generation (server only)
// ─────────────────────────────────────────────

/** Generate a cryptographically random 32-byte hex token. */
export function generateToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node fallback
  const { randomBytes } = require("crypto") as typeof import("crypto");
  return randomBytes(32).toString("hex");
}

// ─────────────────────────────────────────────
// Cookie signing (HMAC-SHA256)
// ─────────────────────────────────────────────

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.TOKEN_COOKIE_SECRET ?? "dev-insecure-secret";
  const raw = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSession(session: ContributorSession): Promise<string> {
  const payload = JSON.stringify(session);
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${Buffer.from(payload).toString("base64url")}.${sigHex}`;
}

export async function verifySession(
  cookieValue: string
): Promise<ContributorSession | null> {
  try {
    const [b64, sigHex] = cookieValue.split(".");
    if (!b64 || !sigHex) return null;
    const payload = Buffer.from(b64, "base64url").toString("utf-8");
    const key = await getSigningKey();
    const sigBytes = new Uint8Array(
      sigHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;
    const session: ContributorSession = JSON.parse(payload);
    if (new Date(session.expires_at) < new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
