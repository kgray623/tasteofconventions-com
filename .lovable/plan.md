# Derive protein from the amount paid — no protein selection field

Right now nothing in the database records which protein a guest chose, and nothing records the dollar amount paid. `meal_payments` has `qty_paid` only — no amount column. That's why every "owed" figure is still shown as a chicken–beef range.

Since the chicken and beef prices are different at all three restaurants, the amount paid uniquely identifies the protein. So instead of asking guests to pick a protein, we capture the amount and let the number tell us.

## What changes for you

- When a payment is recorded (by you, a committee member, or a restaurant), there is a new **Amount paid** field next to quantity.
- As soon as an amount is entered, the system matches it against that restaurant's real prices and labels the line automatically: "1 chicken", "2 beef", "1 chicken + 1 beef", or "Amount doesn't match — needs review".
- Paid lines then show an exact dollar figure instead of a range. Unpaid lines still show the correct restaurant-specific range, because nobody has paid yet and there's genuinely no way to know.
- Reports and the CSV export show: amount paid, protein inferred, and whether the amount reconciles to the restaurant's prices.

## Price reference (already in the database, tax included)

| Restaurant | Cuisine | Chicken | Beef |
|---|---|---|---|
| Lalibela | African | $21.90 | $27.38 |
| Burmese | Myanmar | $21.80 | $27.25 |
| Koen | Indonesian | $24.00 | $29.00 |

## Technical detail

1. Migration on `public.meal_payments`: add `amount_paid numeric(10,2) null` and `protein_inferred text null` (values: `chicken`, `beef`, `mixed`, `unmatched`). Grants already exist on the table; no new table, no RLS change.
2. New helper in `src/lib/meal-pricing.ts`: `inferProteinFromAmount({ cuisine, qty, amount, restaurants })` — solves `c * chicken + b * beef = amount` where `c + b = qty`, with a ±$0.50 tolerance, returning the breakdown or `unmatched`.
3. `src/lib/meal-payments.server.ts` — `recordMealPayment` accepts optional `amount`, runs the inference server-side, and writes both new columns alongside the existing `restaurant_id` lookup. Amount stays optional so existing flows keep working.
4. `src/components/record-meal-payment-dialog.tsx` — add the Amount paid input and show the inferred protein back before submit.
5. `src/components/unpaid-by-committee.tsx` — paid rows use `amount_paid` for an exact total; unpaid rows keep the restaurant-specific range. CSV gains `Amount paid`, `Protein (inferred)`, `Reconciles`.
6. Read-only display of amount + inferred protein in `src/components/meal-payments-to-verify.tsx` and the restaurant portal payment list.
7. Backfill: the 47 existing payment rows have no amount recorded, so they stay null and display as "amount not recorded" rather than being guessed. New payments capture it going forward.

No protein-selection field is added to the order form. No existing data is altered or removed.

## Verification

- Query `meal_payments` after the migration to confirm the columns exist and no rows changed.
- Record a test amount for one guest per cuisine and read back the stored `amount_paid` / `protein_inferred`.
- Read the rendered values on `/admin/meal-texts` for one paid and one unpaid guest per cuisine, and confirm an off-by-a-dollar amount lands in "needs review" rather than silently guessing.
