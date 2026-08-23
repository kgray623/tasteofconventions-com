# Record Tunde's and Linda Braddock's meal payments

Verified against the live database 2026-08-23 17:1x UTC.

## What the database shows

- **Yetunde Adejunmobi**, 785-477-9714 — order on file: **1 Indonesian plate** (Koen). No payment row, no restaurant confirmation.
- **Aunt Linda Braddock**, (719) 338-4353 — order on file: **2 Indonesian plates** (Koen). No payment row, no restaurant confirmation.
- Both are guests of **Dixie Frahm**, which matches her text.

That is why both still show on the Unpaid guests page: nothing was ever recorded.

## Fix

1. Record **1 Indonesian plate paid** for Yetunde Adejunmobi.
2. Record **2 Indonesian plates paid** for Aunt Linda Braddock.
3. Both entered as `committee_recorded`, marked by Kari Gray, method "debit card (phoned restaurant)", `paid_at` = 2026-08-23, note: "Dixie Frahm reported by text 8/23/2026: Linda Braddock phoned Koen and paid by debit card for herself and Tunde."
4. Left **unverified** so both land in the existing "Payments to verify" queue for Koen to confirm — no faked restaurant confirmation.
5. Read both rows back from the database and confirm neither guest appears on `/admin/unpaid` any more.
6. Report before/after committee-wide unpaid totals (households, order lines, plates) with a UTC timestamp.

## Technical detail

- Uses the existing `recordMealPayment` path in `src/lib/meal-payments.server.ts`, which resolves Koen's `restaurant_id` from the Indonesian cuisine so the plates show in that restaurant's portal.
- No schema change, no code change, nothing deleted or overwritten.
