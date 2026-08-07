# Add Venmo and Zelle payment options to the restaurant meal cards

Plan written 2026-08-07 20:4x UTC.

## What guests will see

Under each cuisine's restaurant block (name + tappable phone + website + the August 23 deadline), guests get a "How to pay" section with the options that restaurant actually accepts:

**Indonesian — Koen (owner Inez Retnosari)**
- Call to pay by phone: (402) 853-2509
- Venmo: @Inez-Retnosari (tappable link to venmo.com/u/Inez-Retnosari)
- Zelle: look up 402-853-2509 (tappable to call/copy)

**African — Lalibela**
- Call to pay by phone: (402) 991-5662
- Zelle: Senait T Gebremichael, 402-939-9093
- The uploaded Zelle QR code shown as a small image guests can tap to enlarge and scan in their banking app

**Myanmar / Burmese**
- Unchanged: phone only, (402) 614-8966

Wording stays consistent with the current copy: pay the restaurant directly, all catered meals must be paid for by Sunday, August 23.

These appear everywhere the restaurant contact block already renders: the RSVP form, the RSVP link page, My RSVP, and the standalone order page.

## Admin

Admin → Restaurants gets editable fields per restaurant for Venmo handle, Zelle name, and Zelle phone, so you can change them yourself later without asking me.

## What does not change

No changes to ordering, quantities, confirmations, the paid receipt badge, restaurant portals, meal texts, or pricing. Existing data untouched.

## Technical detail

- Migration: add nullable `venmo_handle text`, `zelle_name text`, `zelle_phone text`, `zelle_qr_url text` to `public.restaurants`. Existing grants/policies already cover the table (anon SELECT of the public columns); the new columns carry no PII beyond what the restaurant publishes.
- Data: set Koen's Venmo handle + Zelle phone; set Lalibela's Zelle name/phone and QR URL.
- Asset: the uploaded Zelle QR becomes a Lovable asset pointer (`src/assets/zelle-lalibela.png.asset.json`) and its CDN URL is stored in `zelle_qr_url`.
- Code: extend the `RestaurantRow` type and select list in `src/components/meal-restaurant-contact.tsx`, and render a "How to pay" list inside `MealRestaurantContact` (phone / Venmo / Zelle / QR, each shown only when present). All four consumer surfaces pick it up automatically. Add the three inputs to `src/routes/_authenticated/admin/restaurants.tsx`.
- Verification: read the rows back from the database, then Playwright at 384x681 on `/rsvp` with a real token and on `/my-rsvp` as a guest with an Indonesian order and one with an African order — confirm the Venmo link, the Zelle number, and the QR image render and the tel/venmo links are correct.
