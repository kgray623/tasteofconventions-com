# Consolidating the three duplicate-tracking systems

Verified against the live database on 2026-08-20 at 19:47 UTC. No data is deleted anywhere in this plan.

## What the database actually shows right now

| Check | Result |
| --- | --- |
| `meal_text_events` rows | 212 (99 original campaign, 113 payment_update) |
| Latest-state "sent" per order line, from events | 22 original + 111 payment update |
| Legacy `meal_text_sends` rows | 22 |
| Legacy `meal_zelle_text_sends` rows | 105 |
| Payment-update "sent" events with **no** legacy `meal_zelle_text_sends` row | **6** |
| `meal_order_status.confirmed = true` | 21 |
| `meal_payments.verified_at` not null | 34 |
| Confirmed-but-not-verified pairs | **5** — Laura Haffke (African), Angela Waters (African), Gussie Sorensen (Indonesian), Aletta Blair (Myanmar), Kari Gray (Myanmar) |
| `duplicate_flags` rows | 5 |
| `duplicate_flag_pairs` rows | 4 |

Both of your production observations are confirmed exactly. The third one is different from what you were told: **`duplicate_flag_pairs` is not a table.** It is a read-only SQL view over `duplicate_flags` that collapses A/B pairs and aggregates `match_type` into an array. There is no second duplicate store and nothing to migrate — 5 flags collapse into 4 unique pairs, which is correct behaviour, not a discrepancy.

## 1. "Was the payment-instructions text sent?"

**Canonical: `meal_text_events`** (append-only, immutable, has campaign + action + actor + evidence_source + who/when). It is the most complete store: 111 payment-update sent marks versus 105 in the legacy table. No new table is needed.

**Becomes read-only legacy:** `meal_text_sends` and `meal_zelle_text_sends`. Keep the rows forever as historical evidence; stop treating them as the answer. Do not drop them.

Root cause of the "logged sent but shows NOT SENT" screen: in `src/lib/meal-texts.functions.ts` the send/event lookup maps are keyed on the **raw** cuisine string from the database, while the row that consumes them is keyed on the **normalized** cuisine ("Burmese" → "Myanmar", etc.). Any event or legacy row stored with a non-canonical cuisine spelling silently misses its row and renders as NOT SENT. `src/lib/meal-communication.ts` and `src/lib/committee-meal-texts.server.ts` already normalize, which is why the same guest looks correct on one screen and wrong on another.

Work:
- Add one server-only resolver (extend `src/lib/meal-communication.ts` / `meal-communication.server.ts`) that returns the current sent state per `preorder_id + normalized cuisine + campaign`: latest event wins; legacy row used only when no event exists for that key. Every cuisine string normalized on the way in.
- Repoint these to that resolver and delete their local send/event maps:
  - `src/lib/meal-texts.functions.ts` (admin Event payment texts) — the miskeyed maps
  - `src/lib/committee-meal-texts.server.ts` (My meal texts) — replace its duplicate merge with the shared resolver
  - `src/lib/meal-notify.server.ts` (notify rollup counts)
  - Consumers of `row.sent_at` / `row.zelle_sent_at`: `src/routes/_authenticated/admin/meal-texts.tsx`, `src/routes/_authenticated/admin/meal-texts-mine.tsx`, `src/components/unpaid-by-committee.tsx` (incl. its CSV "NOT SENT"), `src/components/committee-meal-payments.tsx`
- Writes: keep `markZelleTextSent` writing the event first (source of truth) and mirroring to the legacy table for continuity, so an event can never exist without being reflected in the UI again.
- Backfill: insert the missing 6 mirror rows so legacy and canonical agree, then re-read both and confirm 0 mismatches.

## 2. "Is this restaurant-confirmed as paid?"

**Canonical: `meal_payments`**, with `source = 'restaurant'` and `verified_at` as the confirmation timestamp. It holds the money facts (qty, method, cancellation, permanence triggers); `meal_order_status` only holds a boolean and cannot express partials or payment history. No new table is needed.

**Becomes:** `meal_order_status` stays as the restaurant portal's own checklist/UI state and audit trail, but it is no longer read as a payment truth by anything outside the portal. Not dropped.

Work:
- Restaurant portal confirmation (`setConfirmed` in `src/lib/restaurant-portal.server.ts`) writes both: upsert `meal_order_status` **and** set `meal_payments.source='restaurant'` + `verified_at` for that preorder+cuisine (creating the payment row if none exists, never lowering a qty). Unconfirming clears the checklist only and never erases a payment.
- Repoint reads:
  - `src/lib/meal-payments.server.ts` → `listReportedMealPayments` currently filters `verified_at IS NULL`, so Aletta Blair and Kari Gray still sit in the "payments to verify" queue although the restaurant confirmed them. Add the confirmation join or rely on the backfill below.
  - `src/lib/meal-communication.ts` → keep the confirmation input as a safety net, but it stops being the only thing that makes these 5 look confirmed.
  - `src/lib/restaurant-portal.server.ts` `loadPortalData` → derive `confirmed` from `verified_at` OR the checklist row, so both agree.
  - `src/lib/meal-text-evidence.server.ts` (confirmed-instruction evidence) and any export/CSV that prints confirmation.
- Backfill the 5 named records: set `verified_at = meal_order_status.confirmed_at`, `source = 'restaurant'`, preserving existing `paid_at`. Then verify 0 rows remain confirmed-without-verified.

## 3. "Is this a duplicate guest?"

**Canonical: `duplicate_flags`** (written by the `detect_duplicate_invitations()` trigger). `duplicate_flag_pairs` is its deduplicated presentation view and should stay — it is the correct thing for UI to read, since it is one row per pair with `match_types[]`.

Work (small):
- `src/routes/_authenticated/dashboard.tsx` reads `duplicate_flags` raw, so a pair matched on both phone and name is counted twice (5 flags vs 4 real pairs). Repoint it to `duplicate_flag_pairs`.
- `src/routes/_authenticated/admin/upload.tsx` also reads `duplicate_flags` — repoint for consistent counts.
- No migration, no new table, nothing dropped.

## Verification before anything is called done

- Re-run the table above and require: 0 payment-update sent events without a mirror row, 0 confirmed-without-verified rows, dashboard duplicate count equal to `duplicate_flag_pairs` count.
- On `/admin/meal-texts`, `/admin/meal-texts-mine`, the restaurant portal, and the "payments to verify" queue, confirm the same guest+cuisine shows the same sent state and the same paid/confirmed state on every screen, at your phone viewport, as both admin and committee.
- Confirm all 5 named guests read "Restaurant confirmed paid" everywhere, and that the 6 event-only sent marks read as sent everywhere.
- CSV/XLSX exports regenerated and compared line-by-line with the on-screen lists.

## Technical notes

- One shared server-side resolver per question; no screen keeps its own merge logic. Server-function files stay thin wrappers.
- Cuisine normalization happens once, at the resolver boundary, for events, legacy sends, payments, confirmations, and preorder selections.
- Only additive migrations: the two backfills, plus indexes if needed. No drops, no deletes.
- Add regression cases to `src/lib/meal-communication.test.ts`: event-only sent mark, confirmation-only payment, cuisine spelled "Burmese", duplicate flag pair matched on two match types.
