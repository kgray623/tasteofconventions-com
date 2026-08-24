# Fix meal wording: restaurants prepare the cuisine, and preorders are closed

Two problems on every guest-facing meal surface:

1. The word "cuisine" is used where the **restaurant** is meant ("if a cuisine still has room", "Request Myanmar/Burmese"). A cuisine doesn't prepare or accept anything — the restaurant does.
2. The paragraphs are long and repeat prices twice. Guests just need: preorders are closed, you can pay now, the restaurant decides whether it can still take your order.

## New wording

Section intro (invitation page):

> Ordering a catered meal is optional — it's offered to guests who RSVP in person. Preorders are now closed. The restaurants need time to prepare a large number of plates, so any new order goes on a wait list: you pay the restaurant directly, and your plate is confirmed once that restaurant accepts your payment. Each restaurant offers a chicken or beef plate, and all meals are gluten-free.

Button: **RSVP or request a meal**

Order section heading: **Request a meal from one of our restaurants**

Short line above the restaurant cards:

> Preorders are closed. Pay the restaurant directly to be added to their wait list — Zelle is their preferred method. Prices already include tax. Your plate is confirmed once the restaurant accepts your payment.

Per-restaurant card: lead with the restaurant name and show the cuisine as a subtitle, e.g. **Lalibela** / *African cuisine*, **Burmese** / *Myanmar cuisine*, **Koen** / *Indonesian cuisine*. Button becomes **Request from Lalibela — I'll pay now**.

Confirmation line after submitting: "2 plates requested from Burmese — payment reported, waiting for the restaurant to accept."

Prices stay exactly as they are today ($21.90/$27.38, $21.80/$27.25, $24/$29) but are listed once, on the restaurant cards, not repeated in the intro paragraph.

## Where this changes

- `src/lib/meal-pricing.ts` — rewrite `MEAL_INTRO_COPY`, `MEAL_PAY_DEADLINE_LINE`, `MEAL_PRICE_SUMMARY`.
- `src/components/invitation-page.tsx` — intro paragraph and CTA label.
- `src/components/meal-waiting-list-request.tsx` — headings, card titles, button labels, submitted-state text.
- `src/routes/rsvp.$token.tsx`, `src/components/my-rsvp-content.tsx`, `src/routes/preorder.tsx`, `src/routes/rsvp.index.tsx` — any remaining "cuisine still has room" / "prepay wait list" phrasing.

## Technical notes

Copy-only change. No database, schema, server-function, or business-logic edits: internal `cuisine` keys, the `meal_waiting_list` table, and existing preorder/payment data are untouched — only the labels guests read change. Verified afterwards with a mobile-width (390px) pass over the invitation page and a real `/rsvp/<token>` link, then published.
