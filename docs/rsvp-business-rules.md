# RSVP business rules — canonical

This is the single source of truth for how RSVP numbers are computed. Every
dashboard, admin card, and committee widget must derive its totals from
`src/lib/rsvp-math.ts` via `src/lib/rsvp-totals.functions.ts`. Do not
re-implement these rules inline.

## Vocabulary

- **People** — total party-size across matching invitations. This is what
  the user counts (seats, meals, badges). Always prefer people over rows.
- **Responses** — number of invitation records. Useful for admin diagnostics,
  never for guest-facing totals.
- **Party size** — `rsvps.party_size`; coerced to `1` when null / NaN / ≤0.
  A coercion increments `dataQuality.partySizeCoerced` so admins can find
  and fix the underlying row.
- **Attendance mode** — `in_person`, `zoom`, or `unknown` (blank/other).

## Status buckets

`normalizeRsvpStatus` accepts only `yes | no | maybe | waitlist`. Anything
else — including blank — is treated as **pending**.

| Bucket             | People counted from                                       |
| ------------------ | --------------------------------------------------------- |
| `people.pending`   | party size of every invitation with no valid status       |
| `people.confirmed` | party size of every `yes` row                             |
| `people.inPerson`  | `yes` **and** `attendance_mode = in_person`               |
| `people.zoom`      | `yes` **and** `attendance_mode = zoom`                    |
| `people.inPersonAssumed` | `yes` with blank/unknown mode — **NOT** in-person   |
| `people.declined`  | party size of every `no` row                              |
| `people.maybe`     | party size of every `maybe` row                           |
| `people.waitlist`  | party size of every `waitlist` row                        |

`allIfEveryoneShowed` = sum of every group's party size (worst-case seat need).

## Duplicate collapsing

`buildDuplicateGroupIds` merges rows that share:
- last 10 phone digits (`phoneTail`), **or**
- ≥0.7 Dice-coefficient name similarity **and** overlapping phone tails.

Within a group the winning row is the one with the highest status rank
(`yes > waitlist > maybe > no > pending`); ties break on larger party size.

## Waitlist rule

Waitlist is triggered by **building capacity only** (in-person people ≥ 550).
Inviter quotas never trigger waitlist.

## Data quality signals

`dataQuality` is surfaced to admins as an amber callout in
`RsvpTotalsCard`. When any counter is non-zero, fix the source rows —
these values are silently coerced today and will drift dashboards
tomorrow.

- `partySizeCoerced` — invalid party_size fell back to 1.
- `statusUnknown`   — non-empty status that isn't yes/no/maybe/waitlist.
- `attendanceModeUnknown` — confirmed row with no attendance mode.

## Phone identity

All phone matching goes through `src/lib/phone.ts` (`normalizePhone`,
`phoneTail`, `phoneMatches`). The database mirrors this via the
`guest_phone_normalized` generated column plus `right(..., 10)` matching
in triggers.

## Audit lineage

- CRITICAL-002 — pending counts party size, not rows.
- CRITICAL-003 — unknown attendance mode → `inPersonAssumed`, never
  silently in-person.
- HIGH-001 — `rsvpPartySizeStrict` surfaces coercions.
- HIGH-002 — `normalizeRsvpStatus` is the only status gate.
- HIGH-003 — `rsvp-totals.functions.ts` delegates aggregation to `computeRsvpRollup`.
- HIGH-004 — every helper handles null/undefined inputs safely.
- MEDIUM-001 — phone helpers live in `src/lib/phone.ts`.
- MEDIUM-002 — `computeRsvpRollup` emits a `console.warn` per rollup when
  data quality issues appear.
- MEDIUM-003 — server functions wrap Postgres errors via `friendlyDbError`.
- MEDIUM-004 — every dashboard consumes `getRsvpTotals` (or
  `computeRsvpRollup` directly for per-guest lists).
- LOW-001 / LOW-002 — this doc plus JSDoc at the top of `rsvp-math.ts`.
