# Unpaid plate list update — Ben Ingles paid

Timestamp: 2026-08-25 15:03 UTC

## What the text says

(531) 232-7970 = **Ben Ingles**, 1 Myanmar (Burmese) plate, currently showing unpaid. He says he paid over the phone yesterday.

## Change to make

1. Record 1 Myanmar plate as paid for Ben Ingles — source `guest_reported` (awaiting restaurant verification), linked to the Burmese restaurant, note quoting his 2026-08-25 text ("was able to pay over the phone yesterday").
2. Add/refresh a follow-up note on his Myanmar line so the committee sees why it flipped to paid without a restaurant receipt.
3. Read the totals back from the database and report the refreshed unpaid list.

Expected impact: paid plates 115 → 116, still-to-pay 31 → 30, and Ben Ingles drops off the unpaid list.

## Current unpaid list (before this change) — 31 plates, 25 lines

| Guest | Phone | Restaurant | Plates owed |
|---|---|---|---|
| Adrianna Marie Gonzalez | 402-807-6980 | Myanmar / Indonesian | 1 + 1 |
| Autumn Carlson | 402-460-8121 | African | 1 |
| Ben Ingles | 531-232-7970 | Myanmar | 1 (being paid now) |
| Chanel Jones | 213-909-7589 | African / Myanmar | 1 + 1 |
| Denise Madsen | 402-714-1491 | African | 1 |
| Deshon Bradley | 419-371-4774 | African / Indonesian / Myanmar | 2 + 2 + 2 |
| Dodzi Sossou (with Juliette and Sasha) | +32 486 589852 | Indonesian | 1 |
| EhPaw | 402-203-3249 | Indonesian / Myanmar | 1 + 1 |
| George Aderonmu | 402-706-1647 | Indonesian / African | 1 + 1 |
| Jennifer Juliet Valadez | 402-913-7899 | Indonesian | 3 |
| Juliette and Sasha Sossou-Etse | 402-810-4177 | Indonesian | 2 |
| Kenda Andersen | 402-296-9922 | Indonesian | 1 |
| Latea Glenn | 402-686-5008 | Myanmar | 1 |
| Lydia Madlock | 402-202-3534 | African | 1 |
| Tiana Stoddard | 402-202-8845 | African / Myanmar / Indonesian | 1 + 1 + 1 |
| Tina Santana | 402-657-7364 | Myanmar | 2 (restaurant was closed) |
| Whitney Stone | 402-707-5335 | Indonesian | 1 (restaurant calling her) |

## Technical notes

- Insert into `meal_payments` (preorder `7a8d731f-eb79-4105-9956-6dca56bea90b`, restaurant `1ccd27de-968d-4dae-8918-bb4bcfd43111`, cuisine `Myanmar`, qty 1, source `guest_reported`).
- Follow-up note via upsert on `meal_follow_up_notes` (unique on preorder_id + cuisine).
- Data only — no code changes; `/admin/unpaid` and the committee ledger read these tables live.
