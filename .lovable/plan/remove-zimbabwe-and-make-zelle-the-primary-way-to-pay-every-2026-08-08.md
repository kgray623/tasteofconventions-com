# Remove Zimbabwe, and make Zelle the primary way to pay every restaurant

Plan written 2026-08-08 02:3x UTC.

## 1. Zimbabwe removed from the event

The Journey Together itinerary's Africa stop becomes:

- Country: **Mozambique**
- When: **Convention · 2018**
- Note: rewritten to mention only Mozambique (Zimbabwe and the 2025 reference dropped), keeping the same tone about brothers of faith in a country of persecution.

Zimbabwe appears nowhere else in the app, so this is the only change needed for that.

## 2. Zelle first for all three restaurants

Every cuisine's meal card gets the same payment layout, with Zelle listed first:

**Pay by Zelle (fastest)**
- Myanmar / Burmese — Asian Burmese Restaurant, 310-595-6907 · Chicken $21.80 · Beef $27.25 (includes tax)
- Indonesian — Inez Retnosari, 402-853-2509 · Chicken $24 · Beef $29 (includes tax and delivery fees); Venmo @Inez-Retnosari also shown
- African — Senait T Gebremichael, 402-939-9093 · Chicken $21.90 · Beef $27.38 (includes tax), plus the scannable Zelle QR code

Each Zelle block states plainly that the guest sends the amount for their choice — chicken or beef — and includes their name in the Zelle memo so the restaurant can match the payment.

**Or call to pay by phone** stays underneath, with the restaurant's number, unchanged.

The August 23 payment deadline line stays on every card.

This appears everywhere the restaurant contact block already renders: the RSVP form, the RSVP link page, My RSVP, the standalone order page, and the public meal photo pages.

## 3. Meal texts follow the same order

The `{payment_options}` block in the meal text and the Zelle-update text lists Zelle first (name, number, and the chicken/beef amounts), then the phone number as the alternative. Approved wording and structure are otherwise untouched.

## What does not change

No changes to orders, quantities, confirmations, paid receipts, restaurant portals, tracking marks, login, or referral logic. No stored data is removed — only the itinerary text changes.

## Technical detail

- Data update to `public.invitation_content.itinerary`: replace the Africa entry's `country`, `when`, and `note`.
- `src/components/meal-restaurant-contact.tsx`: reorder the payment block so Zelle (with per-restaurant chicken/beef prices from `chicken_price` / `beef_price` / `price_note`) renders above the "call to pay" line; add the memo instruction; keep Venmo and the QR image inside the Zelle block. Extend `RestaurantRow` + select list with `chicken_price`, `beef_price`, `price_note`.
- `src/lib/meal-text-message.ts`: reorder `{payment_options}` so Zelle comes first for all three cuisines.
- Verification: read the itinerary and restaurant rows back from the database, then Playwright at 384x681 on `/` (itinerary), `/rsvp` with a real token, `/my-rsvp`, and `/meals/myanmar`, `/meals/african`, `/meals/indonesian` — confirming Zelle appears first with the correct chicken/beef amounts for each restaurant and that the generated SMS text matches.
