# Correct meal-text accounting and visibility

## What was confirmed

- Gussie Sorensen has one Indonesian meal with a recorded restaurant payment.
- Melissa Novotny has one Indonesian meal with a verified restaurant payment.
- Kari Gray has African, Indonesian, and Myanmar meals recorded as guest-reported payments; Kari is also the separate self-test recipient.
- The current queue intentionally removes every paid order from the normal text list. That exclusion caused these names to be omitted from the list view, and the previous “7 still need it / 4 real guests” report was incorrect.
- Current database reconciliation is: African 30 = 25 texted + 5 paid; Indonesian 40 = 34 texted + 6 paid; Myanmar 37 = 36 texted + 1 paid. There are currently zero unpaid, untexted meal orders.

## Changes

1. Make `/admin/meal-texts` a complete accounting ledger where no active meal order disappears.
   - Show **Needs text**, **Text sent**, and **Paid — no text needed** as explicit filters with counts.
   - Keep paid guests visible as full rows rather than only small preview links.
   - Keep Kari’s self-test controls separate and exclude them from real-guest counts.

2. Use the canonical meal communication ledger for every displayed count, pending download, and status filter.
   - A paid order is counted as paid, never as outstanding.
   - A sent mark is counted only when explicitly checked after texting.
   - Every active meal unit must reconcile into exactly one visible status.

3. Correct the on-page accounting wording so it clearly states that all real payment texts are currently accounted for and none remain outstanding.

## Verification

- Test the admin role on the exact `/admin/meal-texts` route at the current 384×681 mobile viewport.
- Confirm Gussie Sorensen and Melissa Novotny are visible under **Paid — no text needed**.
- Confirm Kari’s three self-test buttons remain available but do not increase guest totals.
- Read back the database and compare every meal unit with the rendered status counts and pending CSV.
- Verify the three cuisine equations and the overall total reconcile with zero missing or double-counted rows.
