# Meal payment and RSVP bookkeeping corrections

Verified against live records on 2026-08-20 02:34 UTC. Nothing already submitted gets deleted or hidden — only additions and corrections.

## What is wrong right now

- Ava & Joel Brix (402-405-9460): only Myanmar x1 on file, no payment recorded. Joel's Indonesian meal is missing entirely.
- Danielle Walther: African + Indonesian + Myanmar ordered, but only Indonesian recorded paid.
- Melanie Dotsen and Tonya and Jim Lucas are already correct (both paid) — no change needed.
- Lois Piccolo (402-490-2204) and Maria DeAnda (531-389-8548) declined by text but have no RSVP row, so they still count as pending.
- Boyd Braman appears twice (one "no", one "yes"); Tess Andersen and Boyd Braman hold meal selections while their RSVP is "no".

## Data corrections to apply

1. Brix: add an Indonesian x1 meal line to the existing Ava & Joel Brix order, then record payment for Myanmar x1 and Indonesian x1 (reported by Melissa, verified by receipt).
2. Danielle Walther: record payments for African x1 and Myanmar x1 so all three of her meals show paid.
3. Record RSVP "no" for Lois Piccolo and Maria DeAnda, each with a note that the decline came by text on Aug 19, 2026. Existing invitation rows stay intact.

## Integrity review (flag only, no data changes)

- Keep Tess Andersen and Boyd Braman listed under "Data integrity review" with the meal/RSVP conflict spelled out, and add the duplicate-invitation conflict for Boyd Braman so both of his rows are visible side by side with phone and RSVP status.
- No automatic merging, dropping, or hiding — the review list stays read-only.

## Verification before reporting done

- Read the rows back from the database after each write.
- Load /admin/meal-texts at 384x681 signed in as admin and confirm: Brix shows Myanmar + Indonesian under paid, Walther shows all three paid, and neither appears in "needs payment text".
- Confirm the paid/unpaid totals and the CSV export match the database counts, and report the exact before/after numbers with a UTC timestamp.

## Technical notes

- Payment rows go through the existing meal payment recording path (source = guest_reported/restaurant as appropriate) so the `guard_meal_payment_lock()` trigger and audit trail stay intact.
- The Brix Indonesian line is added by merging into `cuisine_preorders.selections` for that existing order, not by creating a second household row.
- Reconciliation counts continue to come from the canonical server-side ledger; no counts are computed in the UI.
