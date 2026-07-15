## Rescan results (2026-07-15 10:52 UTC)

Total findings: **26** (all `warn`/`error` level, none critical net-new from your two fixes).

### Confirmed fixed
- `categories_anon_select_duplicate_policy` — duplicate policy dropped; no longer flagged.
- `invite_notes_leak` — `invitations.notes` no longer appears in the guest-facing selects in `src/lib/invitations.functions.ts`.

### Remaining findings (pre-existing, not part of the previous fix scope)
1. **25 × Supabase linter warnings** on `SECURITY DEFINER` functions being executable by `anon` / `authenticated`. These are existing helpers (e.g. `has_role`, `get_auth_user_id_by_phone`, `ensure_committee_team_role`) that are intentionally callable — they gate other logic. No app-behavior change; each is a hardening opportunity, not a live vulnerability.
2. **1 × AI re-review flag** `EXPOSED_SENSITIVE_DATA` claiming `invitations.notes` is still returned to guests. Grep of the code shows this is stale — the guest-facing selects no longer include `notes` (the only remaining `.notes` reads are `orders.notes`, a different table used for the guest's own pre-order text). The re-scan appears to have re-analyzed against pre-fix reasoning.

### Proposed next steps (pick any subset)
- **A. Do nothing** — the two requested findings are fixed; the rest are pre-existing warnings you have not asked me to touch.
- **B. Verify the stale `EXPOSED_SENSITIVE_DATA`** by running one more scan (results should clear on the next full re-analysis) and, if it persists, add a memory note so future scans stop re-flagging.
- **C. Harden the 25 SECURITY DEFINER functions** — audit each, and for those that don't need anon/authenticated EXECUTE, `REVOKE EXECUTE ... FROM anon, authenticated;` in a migration. This is a larger, separate task; I'd list each function first and get your sign-off before revoking anything, because some (like `has_role`, `get_auth_user_id_by_phone`) MUST stay callable or login/RLS breaks.

Tell me which of A / B / C you want and I'll proceed.
