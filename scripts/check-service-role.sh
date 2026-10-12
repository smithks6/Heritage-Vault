#!/usr/bin/env bash
# The service-role key bypasses RLS. Keep it in one file, and keep the client
# it creates out of anything that could reach the browser.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0

key_files=$(grep -rl "SUPABASE_SERVICE_ROLE_KEY" src || true)
for f in $key_files; do
  if [ "$f" != "src/lib/supabase/server.ts" ]; then
    echo "SUPABASE_SERVICE_ROLE_KEY referenced outside src/lib/supabase/server.ts: $f"
    fail=1
  fi
done

# Server-only callers: API routes, and the token-exchange page under /record.
client_files=$(grep -rl "createServiceClient" src || true)
for f in $client_files; do
  case "$f" in
    src/lib/supabase/server.ts|src/app/api/*|src/app/record/*) ;;
    *) echo "createServiceClient used outside server-only paths: $f"; fail=1 ;;
  esac
  if grep -q '^"use client"' "$f"; then
    echo "createServiceClient imported by a client component: $f"
    fail=1
  fi
done

[ "$fail" -eq 0 ] && echo "service-role usage OK"
exit "$fail"
