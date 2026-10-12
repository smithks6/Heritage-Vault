# Heritage-Vault
Senior Design group project in collaboration with Pop

## Local development

```bash
npm ci
npm run db:start     # local Supabase: applies supabase/migrations and supabase/seed.sql
npm run db:test      # cross-vault RLS denial suite (also runs in CI)
npm run dev
```

Seeded accounts: `kyle@heritage.test` (admin) and `emma@heritage.test` (member), password `heritage-dev`.
Seeded contributor link: `/record/dev-token-dorothy`.

**GitHub Codespaces:** if `db:start` fails with `DbSetupError` and a Postgres
connection timeout, the codespace's legacy iptables `FORWARD` policy is dropping
traffic between Docker containers. Run `sudo iptables-legacy -P FORWARD ACCEPT`
once per codespace session, then retry.

Spike verdicts live in [docs/spikes/](docs/spikes/).
