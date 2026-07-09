## Full audit of every recorded quota request

**UTC:** 2026-07-09 17:05 UTC

I re-scanned every `audit_log` row for `inviters` where `requested_quota` or `quota_requested_at` was ever set on either the old or new side. This is the complete list of quota requests that have ever existed in the database:

| Date (UTC)          | Member                 | Requested | Source of evidence                              | Current state (restored) |
|---------------------|------------------------|----------:|-------------------------------------------------|--------------------------|
| 2026-06-17 16:55    | Dixie Frahm            | 20 → 30   | Original app request (ts recorded); later raised to 30 per your approval | quota=30, requested_quota=30 ✅ |
| 2026-06-29 18:41-42 | Jamy Elker             | 1 → 5     | App request (ts recorded)                       | quota=5, requested_quota=5 ✅ |
| 2026-07-09 16:35    | Betsaida Ruiz          | 30        | Your correction (Kari approved 30)              | quota=30, requested_quota=30 ✅ |
| 2026-07-09 16:42    | Kari Gray              | 51        | Your correction (admin requested 51)            | quota=51, requested_quota=51 ✅ |
| 2026-07-09 16:45    | Shelley & Pat Monaghan | 40        | Prior wiped quota was 40; you confirmed request | quota=40, requested_quota=40 ✅ |

### No other requests exist in the audit trail

Every other inviter currently at `quota=0`/`requested_quota=null` (Andres Gutiérrez, Denise Madsen, Kenda Andersen, Melissa Novotne, Rhonda Wilcher, Rosa Gutiérrez, Tiana Stoddard, Dewinica Salis, Jacquelyn Spears, Jay Wilcher, Jen Spears, Michelle Shauger, Saul Morro, Teresa Drake) has **no `requested_quota` value, no `quota_requested_at` timestamp, and no `quota_request_note` anywhere in the audit history** — not on any insert, update, or delete row. Their prior non-zero `quota` values (where they existed) were seed/import numbers, never a recorded request from the member.

### Proposed action

**No further restores.** All 5 recorded/confirmed requests are already in place. Please reply with the exact member name + requested number if you know of anyone else who asked — I will not invent request amounts from prior seed quotas.
