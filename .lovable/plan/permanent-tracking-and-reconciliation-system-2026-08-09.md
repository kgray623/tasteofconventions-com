# Permanent tracking and reconciliation system

## Verified diagnosis

- No sent history will be removed. The original-message ledger contains **52 sent marks**; the new payment-update ledger contains **0 sent marks**.
- There are **117 restaurant-order message units** representing **145 meal quantities**. These are different measurements and must never share one label.
- The correct current communication groups are:
  - **52 need the payment update**: original message recorded, update not recorded.
  - **65 have received neither message**: neither original nor update recorded.
  - **0 are current**: update recorded.
  - **0 anomalies**: update recorded without an original message.
- The present inconsistency is structural: the overview treats every restaurant-order unit as pending for whichever campaign is selected, while the sending screen limits the update list to records with an original sent mark. Two screens therefore apply different eligibility rules to the same ledgers.

## Build one accounting source of truth

1. **Define every unit once**
   - Create one canonical database-backed meal communication dataset keyed by `preorder + cuisine`.
   - Normalize Myanmar/Burmese, African, and Indonesian cuisine names once at this boundary.
   - Expose separate, plainly named values for households, restaurant-order messages, and meal quantities.
   - Join the original and update ledgers without changing or deleting either ledger.

2. **Classify every order into exactly one communication state**
   - `Needs original/current message`: no original mark and no update mark.
   - `Needs payment update`: original mark exists and update mark does not.
   - `Current`: update mark exists.
   - `Accounting exception`: update mark exists without an original mark, duplicate key, invalid cuisine, missing phone, or an order that cannot be linked to its owning guest/inviter.
   - Make the groups mutually exclusive and require their sum to equal the total number of restaurant-order message units.

3. **Use that source everywhere**
   - Replace independent calculations on Admin Overview, Admin Meal Texts, My Meal Texts, downloads, filters, badges, and committee rollups.
   - Show two actionable queues side by side: **Needs payment update** and **Has received nothing**.
   - Keep sent history visible with timestamps; opening, copying, or tapping Text never changes a status.
   - Only the explicit post-send checkbox writes one mark for one guest/cuisine, followed by an immediate database read-back before changing the displayed count.

4. **Add automatic reconciliation, not trust-based totals**
   - Calculate all dashboard totals from classified rows, never from separately maintained counters or client-side arithmetic.
   - Add an admin reconciliation panel with a UTC “read from database” timestamp, equation checks, and a visible warning instead of a confident total whenever an invariant fails.
   - Prevent bulk or cross-cuisine marking and reject a mark that does not correspond to a current canonical order row.
   - Preserve append-only audit evidence for every sent/undo action, including who acted, which message unit changed, and when.

5. **Extend the same discipline to platform-wide accounting**
   - Inventory each dashboard metric—guests, households, people/party size, RSVP states, meal-order messages, meal quantities, payments, and committee ownership—and give each one a written definition and canonical query.
   - Add reconciliation tests for each category: mutually exclusive states, totals equal row sums, no duplicate identity counted twice, and no unlinked submitted record silently omitted.
   - Where existing submitted records are unlinked, report them as exceptions; do not hide, merge, overwrite, or delete them automatically.

## Validation before any completion claim

- Database read-back must reproduce the current baseline: **117 message units = 52 need update + 65 received nothing + 0 current + 0 anomalies**, and **145 meal quantities**.
- Compare every overview total to every row in both actionable queues and their CSV exports.
- On the admin route and committee route, at the user’s exact viewport, send and explicitly mark one item from each queue; confirm only that item moves, the database row exists, all totals reconcile, and Undo restores the prior state.
- Verify as both admin and committee roles, including “acting for” another committee member and unlinked-record handling.
- Run platform-wide reconciliation tests and display any unresolved exception rather than suppressing it or presenting an unverified number.

## Technical details

- Keep `meal_text_sends` as original-message history and `meal_zelle_text_sends` as payment-update history.
- Put canonical row construction and classification in one server-only accounting module or database view; all server-function files remain thin authenticated wrappers.
- Add a schema migration only for database views, constraints, or audit protections required by the canonical model; no data-deletion operation is part of this work.
- Treat a restaurant-order message (`preorder_id + normalized cuisine`) as the atomic communication unit. Household count and summed meal quantity remain separate derived measures.