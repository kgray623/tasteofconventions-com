# Committee "who has prepaid" list + Zelle QR codes for Burmese and Indonesian

Read from the database 2026-08-10 17:57 UTC.

## What exists today

- The committee screen (Admin → My meal texts) already loads each of their guests' meal orders with a payment state (`paid_confirmed`, `paid_reported`, `needs_update`, `update_sent`, `exception`).
- But payment only appears as a small "Already paid — no text needed: names" line inside the texting queue. There is no plain paid / not-paid roster a committee member can scan to know who to follow up with.
- Zelle QR images: only Lalibela (African) has one stored. Burmese and Koen (Indonesian) have a Zelle name and phone but **no QR image** — confirmed by reading the restaurants table.

## What gets built

### 1. "My guests' meal payments" panel (committee)

A new section at the top of the committee meal screen, above the texting queue, showing every one of that committee member's guests who pre-ordered a meal, split into two clear groups per restaurant:

- **Paid** — name, restaurant, plates, how it was recorded (restaurant confirmed, or reported by the guest and awaiting the restaurant), and the date.
- **Not paid yet** — name, phone (tap to call/text), restaurant, plates, amount owed at $20 chicken / $25 beef, and whether the payment update text has been sent yet.

Header line: "X of Y plates paid · $Z still owed", with a "Read from the database … UTC" stamp and a Refresh button, using the same canonical ledger as the admin screens so the numbers cannot disagree.

Same panel is available to admins acting for a committee member (existing "acting for" picker keeps working), and admins keep their full view.

Nobody is hidden: a guest appears in exactly one of the two groups, and the two groups always sum to that member's total plates.

### 2. Zelle QR codes for Burmese and Indonesian

Store the two uploaded QR images against their restaurants:

- Burmese (Myanmar) → Kawnnan Sumlut, 310-595-6907
- Koen (Indonesian) → Inez Choi, (402) 853-2509

Note: the Indonesian Zelle name currently on file is "Inez Retnosari" while the QR reads "INEZ CHOI". I will store the QR as-is and leave the existing name unless you tell me which one is correct.

Once stored they show automatically wherever the African QR already shows — the guest's meal card on the RSVP page and the meal restaurant contact block — so guests can scan in their banking app instead of typing a phone number.

## Verification before this is called done

- Read back from the database that both restaurants have a QR image URL, then load the Burmese and Indonesian meal cards on a 384px viewport as a guest and confirm each QR renders and enlarges.
- Sign in as a committee member with guests (Tina Santana or Melissa Novotny) at 384px and confirm the paid / not-paid split matches a direct database read for those guests, including Melissa's guest-reported Zelle payment appearing as "reported, awaiting restaurant confirmation".
- Confirm paid + not-paid plates equal that member's total plates, and that no guest, order, or send/paid history is removed or altered.

## Technical details

- `src/lib/committee-meal-texts.server.ts`: add `zelle_qr_url` to the restaurant select and return per-row amount owed; rows already carry `state`, `paid_at`, `paid_source`.
- New `src/components/committee-meal-payments.tsx` rendering the two groups from the existing `getMyMealTexts` result — no new server function, no new query path.
- `src/routes/_authenticated/admin/meal-texts-mine.tsx`: mount the panel above the queue; leave the queue behaviour untouched.
- `src/lib/meal-text-defaults.ts` / `src/lib/meal-texts.functions.ts`: include `zelle_qr_url` in the `MealRestaurant` shape so committee/admin screens can show it too.
- Images become Lovable Assets from the uploads and their URLs are written to `restaurants.zelle_qr_url` via a data update (no schema change).
- No deletions anywhere.
