# Make the excluded meal orders visible on Event payment texts

Right now the payment-text page only shows orders tied to an attending RSVP. Orders whose RSVP is "no" (or pending) are silently dropped from every group and every count. That is why the raw database shows more rows than the page: the page's "Needs payment text" shows 5 while the database has 7 unpaid/un-texted lines, and "Text sent — payment still due" shows 77 while the database has 81 texted-but-unpaid lines.

Two of those gaps are already explained (Le Ann Bennett declined; Sandy Morris was marked sent Aug 14). The rest need to be listed on screen instead of disappearing.

## What gets added

1. A new read-only section at the bottom of `/admin/meal-texts`, titled **"Excluded — meal on file but RSVP is not yes"**, grouped by cuisine like the other sections. Each row shows the name, phone, plates, cuisine, the RSVP status (`no` / `pending`), and whether a payment text was ever marked sent and whether payment is recorded.
2. No Text / Mark sent / They already paid buttons in that section — it is evidence only, so nobody gets chased for a meal they cancelled.
3. A line under the four metric tiles reading e.g. "N more cuisine orders are excluded because the RSVP is not yes — listed below", so the counts can never look like the whole picture again.
4. Nothing is deleted, merged, or hidden. Every order stays in the database exactly as submitted.

## Verification before I call it done

- Read the excluded set directly from the database and confirm the on-screen section matches it row for row, including the exact reason each row is excluded.
- Confirm the four existing metrics and the four existing sections do not change (still 119 orders / 151 plates / 5 needs-text / 77 texted-due at the time of the check), so this is purely additive.
- Load `/admin/meal-texts` at 384x681 as an admin and read the rendered section, not just the code.
- Report the numbers with a UTC timestamp.

## Technical detail

- `src/lib/meal-texts.functions.ts`: the row builder currently does `if (!ledgerRow) continue;`, which is where non-attending orders vanish. Keep that behaviour for the four existing groups, and additionally return an `excluded` array carrying preorder id, name, phone, cuisine, qty, rsvp status, text-sent timestamp and payment state for those skipped rows. The RSVP status comes from the existing invitation join.
- `src/routes/_authenticated/admin/meal-texts.tsx`: render the new `excluded` array in a read-only variant of `RosterSection` (no action buttons) plus the note under the metrics.
- No schema change, no migration, no data change.
