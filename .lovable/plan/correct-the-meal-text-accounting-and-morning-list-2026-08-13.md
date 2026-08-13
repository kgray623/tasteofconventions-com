# Correct the meal-text accounting and morning list

**Live backend audit: August 13, 2026 at 05:46 UTC (12:46 AM Chicago)**

## What the database actually proves

These are different units and must never be presented as the same number:

- **134 active meal plates** — the quantities ordered.
- **69 active preorder contacts / phone numbers** — one contact may have 1, 2, 3, or 6 plates.
- **106 required cuisine-specific instruction texts** — one required text for each contact + cuisine combination, regardless of plate quantity.
- **85 August 12 sent marks** across 57 preorder contacts — the exact number of sent actions recorded in the platform that day.
- **83 of those marks still match active contact + cuisine orders.**
- **2 marks no longer match the active ledger:** Gloria J. Groves, Myanmar (Zoom), and Frank Skorniak, Indonesian (meal no longer in the active selections).
- **23 active cuisine-specific instruction texts remain**, belonging to **14 phone contacts**.
- Reconciliation: **83 active marked texts + 23 active texts remaining = 106 required texts**.
- Plate distribution confirms that 69 contacts does not mean two meals each: 25 contacts ordered 1 plate, 29 ordered 2, 13 ordered 3, and 2 ordered 6; total **134**.

The database proves that 85 sent actions were marked. It does not independently prove delivery from Kari's phone. The screen must call them “marked sent,” not claim they were physically delivered.

## Changes

1. Replace the misleading contact-level headline on `/admin/meal-texts` with four separately labeled totals: plates, phone contacts, required cuisine texts, and cuisine texts marked sent.
2. Use cuisine-level subtraction instead of treating one marked cuisine as proof that every cuisine for that phone was sent.
3. Show the morning work list as **23 individual cuisine texts for 14 contacts**, grouped by phone contact so each person appears once with every outstanding cuisine listed.
4. Clearly identify the 2 historical August 12 marks excluded from the active count, without deleting or changing either record.
5. Make the CSV export the same 23 outstanding contact+cuisine messages shown on screen.
6. Keep all preorder quantities, RSVP records, sent history, payment records, and guest information unchanged.

## Exact outstanding cuisine-text breakdown

- **African: 7**
- **Indonesian: 9**
- **Myanmar: 7**
- **Total: 23 cuisine-specific texts for 14 phone contacts**

## Verification

- Re-read the live backend after implementation and prove: **134 plates / 69 contacts / 106 required texts / 83 active marked / 23 remaining**.
- Verify every outstanding contact+cuisine pair against the active preorder selections.
- Sign in as Kari/admin and verify `/admin/meal-texts` at **384×681**.
- Confirm the screen and CSV contain exactly 23 outstanding cuisine rows grouped under exactly 14 phone contacts.
- Confirm no read, export, or page visit changes any preorder, RSVP, sent mark, payment, or guest record.
