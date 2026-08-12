# Cancel Laquita Jones's catered meals

2026-08-12 11:45 UTC

## What the database shows right now

- Laquita Jones — (402) 208-6599 — has **3 plates ordered**: 1 African, 1 Indonesian, 1 Myanmar (last updated 2026-08-07).
- She has **no payments, no restaurant confirmations, and no meal texts recorded** — so cancelling costs nothing and reverses nothing that was paid.
- Her RSVP is **Yes, party of 1**, currently flagged as ordering food.

## What I will do

1. **Cancel all three meals** — her meal record is kept (name, phone, history intact) with an empty meal selection, which is how this platform records a cancellation. Nothing is deleted.
2. **Mark her as not ordering food** on her RSVP so her Yes/party size stays exactly as-is but she no longer shows as a meal orderer.
3. The permanent activity ledger keeps the before/after values and who made the change.

## Verification before I say it's done

- Read her record back: meal selection empty, name/phone/RSVP/party size unchanged.
- Confirm African, Indonesian, and Myanmar plate counts each drop by exactly 1 in the meal totals.
- Confirm she no longer appears on any restaurant order list, the pre-pay text queue, or the meal CSV export.

## Technical notes

- Data-only change: `cuisine_preorders.selections` set to `[]` for id `39ba9856-3e51-429d-8fa4-62f449900c58`, plus `rsvps.ordering_food = false` for invitation `cfee2a4a-f207-457b-a715-070206dcec5e`. No row deletions, no code changes.
