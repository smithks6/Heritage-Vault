import { createBrowserClient } from "@supabase/ssr";

// Lazy singleton — only created in the browser. During SSR the env vars
// may not be present, so we guard with a placeholder that is never called.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );
  }
  return _client;
}
