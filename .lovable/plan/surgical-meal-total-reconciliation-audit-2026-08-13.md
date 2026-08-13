# Surgical meal-total reconciliation audit

**Plan timestamp: 2026-08-13 03:37 UTC**

## Scope and safeguards
- Preserve the canonical meal ledger, existing payment-recording UI, guest data, RSVP records, restaurant portal behavior, and every historical payment/text record.
- Make no database schema or data changes.
- Remove the unrelated committee-roster presentation/wiring from the meal-text route because it was not part of this request; retain the already-recorded committee audit rows and table untouched so no history is deleted or overwritten.
- Do not change event content: the event remains Sunday, August 30, 2026.

## Verified current baseline
The live database currently contains:
- **134 plates**
- **69 households**
- **106 cuisine order lines**
- Cuisine totals: **African 36, Indonesian 55, Myanmar 43**

The current source already has:
- `MealCommunicationTotals.plates_reconcile`
- One server-side computation in `buildMealCommunicationLedger`
- `MealCountsCard` reading `data.totals.plates_reconcile`
- A malformed-selection regression asserting `plates_reconcile === false`

These pieces will be preserved and verified rather than rewritten.

## Implementation
1. **Restore the requested meal-text screen scope**
   - Remove only the unrequested “Text every committee member” UI and its route/server-function wiring.
   - Restore the existing event meal-contact/payment-text reconciliation presentation.
   - Do not delete the committee tracking table or its sent/reversed audit entries.

2. **Complete the aggregate-total audit**
   - Confirm every event-wide meal/payment aggregate uses `loadMealCommunicationLedger` or `getMealNotifyRollup`.
   - Require both visible checks where an event-wide aggregate is shown:
     - order-line `reconciles`
     - plate/cuisine `plates_reconcile`
   - Correct only screens or exports that fail that rule; do not restructure working components.
   - Treat personal order editors and restaurant-scoped portals as scoped totals, not event-wide totals, and leave their logic unchanged.

3. **Files already checked and present findings**
   - `src/lib/meal-communication.ts` — canonical totals and both reconciliation invariants are server-built.
   - `src/lib/meal-communication.server.ts` — canonical database loader.
   - `src/lib/meal-notify.server.ts` / `.functions.ts` — event-wide rollup delegates to the canonical ledger.
   - `src/components/meal-counts.tsx` — reads canonical plates, households, order lines, and both checks; no client plate reconciliation remains.
   - `src/components/meal-notify-tracker.tsx` — canonical totals and both mismatch warnings are present.
   - `src/routes/_authenticated/admin/preorders.tsx` — local restaurant report is compared visibly with both canonical invariants; CSV total must be checked against the same canonical value before export.
   - `src/routes/_authenticated/admin/meal-texts.tsx` — canonical reconciliation is present; remove only the unrelated committee-roster addition.
   - `src/routes/_authenticated/admin/meal-texts-mine.tsx` and `src/components/committee-meal-payments.tsx` — committee-scoped totals come from rows filtered out of the canonical ledger; add/pass the two scoped reconciliation results only if needed to make a mismatch visible.
   - `src/components/notification-bell.tsx` — no meal or payment aggregate; no change.
   - `src/components/meal-payments-to-verify.tsx` — displays a deliberately scoped subset, not an event-wide total; no canonical headline change.
   - `src/routes/restaurant.tsx` and restaurant portal helpers — restaurant-scoped totals only; audit and document, but do not alter portal behavior.
   - `src/routes/preorder.tsx`, `src/routes/rsvp.$token.tsx`, and `src/components/my-rsvp-content.tsx` — user-entered/current-user order totals only; no event-wide aggregate.
   - `src/lib/admin-audit.functions.ts` — event meal totals already use the canonical ledger; expose both invariant states anywhere its aggregate is rendered.
   - `src/routes/_authenticated/admin/restaurants.tsx` — payment totals are restaurant-scoped; no event-wide aggregate.
   - `src/lib/meal-communication.test.ts` — preserve and run the malformed-selection and zero-quantity cancellation regressions.

## Verification before any completion claim
- Run the focused meal-ledger regression suite and type checks.
- Read the live database again and report plates, households, order lines, and cuisine totals with a fresh UTC timestamp.
- Sign in as admin and verify every touched event-wide screen at exactly **384×681**:
  - Admin Overview meal counts
  - Admin Meal texts reconciliation
  - Admin Preorder report and CSV
  - Pre-pay notification tracker
  - Any admin-audit surface changed after the audit
- Confirm each touched screen renders the same **134 / 69 / 106** baseline unless live data legitimately changes during verification; if it changes, report the new database-backed numbers instead.
- Force the malformed fixture in the regression test and confirm `plates_reconcile` becomes false and the relevant UI warning path is covered.
- Confirm no guest, RSVP, restaurant, payment, text-history, or committee audit row changed during viewing/export verification.
