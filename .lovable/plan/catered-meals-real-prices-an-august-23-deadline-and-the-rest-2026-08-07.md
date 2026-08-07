# Catered meals: real prices, an August 23 deadline, and the restaurant's number right on the RSVP

Plan written 2026-08-07 07:0x UTC.

## What changes for guests

1. **Clear pricing on every cuisine card** — each meal card (Burmese/Myanmar, African, Indonesian) shows:

   > Chicken $20 per plate · Beef $25 per plate
   > (*prices do not include sales tax or tip)

   This replaces the vague "$20 to $30 range" wording everywhere a guest sees it: the RSVP form, the RSVP link page, the "My RSVP" page, the standalone order page, and the invitation page's meal section.

2. **Payment deadline stated up front**

   > All catered meals must be paid for by **Sunday, August 23**.

   Shown in the meal section heading area and repeated next to each ordered meal until it is marked paid.

3. **Restaurant contact info shown as soon as a meal is selected** — under each cuisine card, and again in the "Your meal orders" summary, the guest sees the restaurant's name, a tappable phone number, and its website link, with the instruction to call and pay for the meal directly over the phone. Pulled live from the restaurants list in the database, so when you edit a phone number in Admin → Restaurants it updates here too. No text message required for the guest to get the number.

4. **"Pre-order" becomes "Order"** — all guest-facing wording ("pre-order", "pre-ordered", "pre-pay", "pre-payment") becomes "order" / "ordered" / "pay" / "payment". Page titles and the standalone `/preorder` page headings change too (the URL stays the same so existing links keep working).

5. **The receipt stays the source of truth** — the paid badge on the guest's RSVP is unchanged in behavior: it appears only after that restaurant marks that meal paid in their own portal, per cuisine. Wording becomes "Paid — confirmed by {restaurant}. Show this at the door to pick up your meal." Meals not yet confirmed keep showing the restaurant's number and the August 23 deadline.

## What does not change

- No database schema changes. Existing orders, quantities, confirmations, payments, texted marks, and audit history are untouched.
- Restaurant portals, admin meal tracking, and the committee text tools keep working exactly as they do now (their internal labels stay, per your answer to keep admin tracking working the same).
- Ordering a cultural meal is still optional and still only offered to in-person RSVPs.

## Technical detail

- New shared client-safe module `src/lib/meal-pricing.ts`: the price line, the `AUGUST 23` deadline string, and a cuisine→restaurant matcher reusing `normalizeCuisine` from `src/lib/preorder-math.ts`.
- New presentational component `src/components/meal-restaurant-contact.tsx`: name, `tel:` link, website link, "call to pay directly" line, deadline. Used by all guest meal surfaces.
- Restaurant rows read client-side via the existing anon-readable `restaurants` select (same call `src/routes/restaurants.tsx` already makes: `id, name, cuisine, phone, website`).
- Edits: `src/components/my-rsvp-content.tsx`, `src/routes/rsvp.$token.tsx`, `src/routes/rsvp.index.tsx`, `src/routes/preorder.tsx`, `src/components/invitation-page.tsx`. Copy-only plus the new contact block; no changes to submit handlers, server functions, or payment/confirmation logic.
- Verification: Playwright at 384x681 on `/rsvp` (a real token), `/my-rsvp` as a guest with a paid meal and a guest with an unpaid meal, `/preorder`, and `/` — confirm the price line, the deadline, and a working tappable restaurant number render on each, and that the paid badge still reflects the database row.
