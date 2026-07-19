## Audit fixes — Critical + High items

Scope: `src/lib/rsvp-math.ts` (canonical engine) and `src/lib/rsvp-totals.functions.ts` (server rollup), plus the small set of components/pages that read them. No schema changes required — pure calculation and normalization work. Every fix is verified end-to-end (DB read-back + preview) before I call it done.

### CRITICAL-002 — Pending counts people, not responses
In `rollupRsvps`, when `status` is null/unrecognized, add `party` to `people.pending` (already), and also make sure **every surface that shows "Awaiting RSVP"** reads `people.pending`, not `responses.pending`. Audit `rsvp-totals-card.tsx`, `committee-workspace.tsx`, and admin dashboards; switch any remaining response-count reads to people-count.

### CRITICAL-003 — Unknown attendance mode is flagged, not silently In-Person
- Add a third bucket to `rollup.people` and `rollup.responses`: `inPersonAssumed` (yes + mode is null/unknown) separate from `inPerson` (yes + mode explicitly `in_person`).
- Add `rsvpAttendanceMode(mode)` that returns `"in_person" | "zoom" | "unknown"` and stop falling through to in-person on nulls.
- Surface `inPersonAssumed` on the admin totals card as a small "⚠ N need attendance mode" chip with a click-through to the affected rows.

### HIGH-001 — Silent party-size correction becomes a warning
- `rsvpPartySize` currently coerces invalid values silently. Add `rsvpPartySizeStrict()` that returns `{ value, wasCoerced, raw }`.
- In `rollupRsvps`, count coerced rows into a new `rollup.dataQuality.partySizeCoerced` counter.
- Admin totals card exposes: "⚠ N records with invalid party size" with a link to the affected invitation IDs.

### HIGH-002 — Centralize status normalization
- Move `normalizeRsvpStatus` to the single call path. In `rsvp-totals.functions.ts` the server currently uses raw `rsvp.status` strings in several places (lines ~141, 172, 230, 241, 284) — route all of them through `normalizeRsvpStatus` before use, and count unknown values into `rollup.dataQuality.statusUnknown`.

### HIGH-003 — Single authoritative calculation service
- `rsvp-totals.functions.ts` currently duplicates aggregation logic that overlaps with `rollupRsvps`. Refactor the server function to build the same `{invitation_id, status, party_size, attendance_mode}` row list and delegate to `rollupRsvps`. Delete the parallel counters.
- Keep the server fn signature stable so no callers change.

### HIGH-004 — Defensive guards
- Every input row in `rollupRsvps`, `rsvp-totals.functions.ts`, and the preorder math treats `null`/`undefined`/malformed values explicitly: coerce numerics through the strict helper, treat missing invitation IDs as skipped-with-warning (not counted anywhere), and add a top-of-file JSDoc contract for each helper.

### Data-quality surface (ties HIGH-001/002 together)
Extend the rollup return with:
```ts
dataQuality: {
  partySizeCoerced: number;
  statusUnknown: number;
  attendanceModeUnknown: number;
  invalidRowsSkipped: number;
}
```
Render as a single "Data quality" admin card so anomalies are visible instead of hidden.

### Verification (Definition of done)
1. Read live `rsvps` rows: count `status is null`, `attendance_mode is null`, `party_size < 1` per event.
2. Re-run rollup and confirm numbers match the raw DB counts exactly.
3. Load `/admin`, `/committee`, and a guest `/rsvp/:token` on 384px mobile viewport (the user's device) via Playwright and screenshot each headline number.
4. Verify Kari Gray's earlier discrepancy scenarios (27 declines, 65 vs 92) reconcile to a single number sourced from the unified service.
5. Report the exact before/after numbers, not "looks right".

### Out of scope for this pass
- MEDIUM/LOW items (phone formatting audit, structured logging, error UX polish, docs/comments) — separate follow-up.
- Phase 2 Supabase schema audit — separate pass.
- Any UI or business-rule change beyond the numbers audit above.
