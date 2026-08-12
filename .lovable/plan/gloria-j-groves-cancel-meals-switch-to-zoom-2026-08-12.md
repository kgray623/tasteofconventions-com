# Gloria J Groves — cancel meals, switch to Zoom

Timestamp: 2026-08-12 16:2x UTC

## What the records show now

- Gloria J Groves, 402-670-7566 — RSVP **Yes**, party of **2**, attendance **In person**, ordering food **yes**.
- Meal pre-order: **Myanmar x2**.
- No payments, no restaurant confirmations, and no meal texts recorded for her — nothing paid to protect.

## What will change

- Meals: her Myanmar 2 plates are cancelled — meal selection emptied, marked as not ordering food.
- Attending: attendance switched from **In person** to **Zoom**, so she is removed from the in-person/building count.
- Kept exactly as-is: her name, phone, RSVP **Yes**, and party of **2** (now counted as Zoom, not in-person). Her record is never deleted.

## Expected result after the change

- Myanmar meal total drops by exactly 2 (46 → 44); African and Indonesian unchanged.
- She disappears from every meal surface: admin meal report, restaurant order lists, committee pre-pay lists, pre-pay text queue, and the meal CSV export.
- In-person people count drops by 2; Zoom count rises by 2; total confirmed people unchanged.

## Technical notes

- Update `cuisine_preorders.selections` to `[]` for her row, with the meal-reduction safety trigger authorized explicitly (`app.meal_reduction_authorized`) since there is no payment history.
- Update `rsvps.ordering_food = false` and `rsvps.attendance_mode = 'zoom'` for her invitation.
- Verification: re-read her rows from the database, re-read Myanmar/African/Indonesian totals, and check `/admin/preorders`, `/admin/meal-texts`, `/admin/guests`, plus the meal CSV export at mobile size (384x681) to confirm her name no longer appears on any meal list and shows as Zoom on the guest roster.
