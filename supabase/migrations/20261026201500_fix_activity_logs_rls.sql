-- Scope activity_logs reads to the caller's own vault.
--
-- 20261019184259_add_activity_logs.sql created the read policy as
--   FOR SELECT TO authenticated USING (true)
-- which let any signed-in user read every vault's activity. ActivityLog.tsx
-- queries this table from the browser with `select('*')` and no vault filter,
-- so RLS is the only thing scoping the rows.
--
-- vault_id is nullable here, so a row with no vault is denied outright rather
-- than being readable by everyone. is_vault_member() would already return
-- false for a NULL argument; the explicit check states the intent.

DROP POLICY IF EXISTS "Allow members to view activity logs" ON public.activity_logs;

CREATE POLICY "vault_members_read_activity"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    vault_id IS NOT NULL
    AND is_vault_member(vault_id)
  );

-- No INSERT/UPDATE/DELETE policy: writes go through the service-role client,
-- the same way audit_log is handled.

-- The policy filters every read by vault_id, and the component orders by
-- created_at, so index the pair.
CREATE INDEX IF NOT EXISTS activity_logs_vault_created_idx
  ON public.activity_logs (vault_id, created_at DESC);
