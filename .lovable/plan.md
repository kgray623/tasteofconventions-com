# Cancel Tirzah Corbin's and Nyime Gilchrist's catered meals

2026-08-12 12:08 UTC

## What the database shows right now

- **Tirzah Corbin** — 6084124014 — 2 plates: 1 Myanmar, 1 Indonesian. No payments, no restaurant confirmations, no meal texts sent. RSVP is **No**, party of 1, currently flagged as ordering food.
- **Nyime Gilchrist** — 2023806212 — 3 plates: 1 African, 1 Indonesian, 1 Myanmar. No payments and no restaurant confirmations; meal update texts were sent 8/7/2026 (history stays, reference only). RSVP is **No**, party of 1, currently flagged as ordering food.

Nothing paid, so cancelling reverses no money.

## What I will do

1. **Cancel all plates for both** — each meal record is kept (name, phone, and full history intact) with an empty meal selection, which is how this platform records a cancellation. Nothing is deleted.
2. **Mark both as not ordering food** on their RSVPs; their No status and party size stay exactly as-is.
3. The permanent activity ledger keeps before/after values and who made the change. Their earlier meal-text history is left untouched.

## Verification before I say it's done

- Read both records back: selections empty, names/phones/RSVP/party size unchanged.
- Confirm plate totals drop by exactly the right amounts: African −1, Indonesian −2, Myanmar −2.
- Confirm neither appears on any restaurant order list, the pre-pay text queue, or the meal CSV export.

## Technical notes

- Data-only change: `cuisine_preorders.selections = '[]'` for ids `f49e9503-7c35-4df4-930c-f68be5ed628b` (Tirzah) and `f1ac3c14-630a-4194-a5de-3addad9536ed` (Nyime), plus `rsvps.ordering_food = false` for invitations `38d7a42f-...` and `38e9a01f-...`. No row deletions, no code changes.
