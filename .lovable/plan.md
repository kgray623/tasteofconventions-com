# Autumn/Perry Carlson — record the African beef plate as paid

Verified against the live database 2026-08-25 19:52 UTC.

## What the two screenshots settle

1. **Text thread** with (402) 460-8121 "Perry & Autumn": Kari sent 808.278.7562, Autumn replied "You should have it! Thank you so much for your help! This was the meal my daughter really wanted!"
2. **Wells Fargo receipt (2:49 PM)**: **$27.38 sent to Senait Gebremichael**, memo *"beef meal for (402) 460-8121 Perry Carlson"*, confirmation **WFCT22KW4N2C**.

That amount and payee match the database exactly: Lalibela (African), Zelle name "Senait T Gebremichael", beef price **$27.38**. So the outstanding African plate is now paid — a **beef** plate, sent by Kari on the Carlsons' behalf.

## What the database shows now

Autumn Carlson, 402-460-8121 — order on file: African 1, Indonesian 2, Myanmar 1.

- Indonesian 2 — already paid (guest-reported, Venmo, 8/24)
- Myanmar 1 — already paid (guest-reported, Zelle, 8/24)
- **African 1 — no payment row; still unpaid.** Follow-up note reads only "Sent" (today 14:46 UTC).

## Change

1. Record her **1 African plate as paid** — Zelle, **$27.38 beef**, restaurant **Lalibela** linked, recorded by Kari Gray (committee-recorded, awaiting restaurant verification).
   - Note: "Zelle $27.38 beef plate sent to Senait T Gebremichael 2026-08-25, confirmation WFCT22KW4N2C, memo 'beef meal for (402) 460-8121 Perry Carlson'. Paid by Kari Gray on the Carlsons' behalf. Awaiting Lalibela verification."
2. Replace the ambiguous "Sent" follow-up note on the African line with that clear wording, so the beef choice and confirmation number stay visible.
3. Nothing else changes: her Indonesian and Myanmar payments, plate counts, RSVP, and full text history stay exactly as they are.

## Expected result after the change

- The Carlsons drop off the unpaid list on /admin/unpaid and out of the unpaid-by-committee rollup entirely
- Their African plate appears under "Reported paid — awaiting restaurant confirmation"
- Paid plates go up by 1; still-to-pay goes down by 1
- Lalibela's portal shows the plate as reported, not yet verified

## Technical detail

Insert one row into `meal_payments` for `preorder_id = 10c2b7c0-33bb-4fc6-8c65-8517579a4ed7`, `cuisine = 'African'`, `qty_paid = 1`, `source = 'committee_recorded'`, `method = 'zelle'`, `restaurant_id = d4c17566-10a8-4713-b4b8-4f2787dfb25b`, `verified_at` null, reported note as above. Update the matching `meal_follow_up_notes` row. No schema or code changes. All counts read back from the database and reported with a UTC timestamp.
