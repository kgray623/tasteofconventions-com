# Add Zelle payment to the Burmese meal

2026-08-07 21:1x UTC

## Confirmed current state

- `restaurants` Burmese (Myanmar) row has phone (402) 614-8966 and no Venmo or Zelle values.
- Koen and Lalibela already have Zelle/Venmo, and the guest meal card already renders an "Or pay online" block whenever those fields are set.

## Change

Set the Burmese restaurant's Zelle details from the text you received:

- Zelle phone: 310-595-6907
- Zelle name: Asian Burmese Restaurant

That's a data update only — no code change needed. The guest meal card for the Burmese/Myanmar meal will then show:

- Call to pay directly: (402) 614-8966
- Or pay online — Zelle: look up 310-595-6907 — Asian Burmese Restaurant

It appears everywhere the meal contact block already renders: the RSVP form, the RSVP link page, My RSVP, and the order page. Editable later in Admin → Restaurants.

## Not changed

The restaurant's login phone number, meal texts, pricing, orders, paid marks, and the August 23 deadline all stay exactly as they are.

## Verification

- Read the Burmese row back from the database.
- Load an RSVP page with a Burmese meal at 384x681 and confirm the Zelle line and the tappable number render correctly next to the phone option.
