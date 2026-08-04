# Restaurant portals: live order lists, restaurant marks paid, guest sees a paid receipt

No more spreadsheets to email and re-email. Each restaurant gets its own private page that is always current, they check off each order as they collect payment, and the guest instantly sees "Paid" on their RSVP so they can pick up their meal at the event.

## How it works

1. **Each restaurant gets a private portal** at `/restaurant` — one page per restaurant, showing only their own cuisine's orders. Kitchen staff log in with the restaurant name plus a short access code you control (no email, no app install). You can rotate a code any time from admin.
2. **What they see**, always live from the platform:
   - Total meals still unpaid and total collected, at the top.
   - A row per household: guest name, phone, how many meals, and paid/unpaid status.
   - Search box and an Unpaid-only filter.
   - Optional print/download of the current list for the kitchen wall.
3. **They tap "Mark paid"** on a row when the guest calls and pays. One tap, no typing. Tapping again undoes it (both actions are logged with who did it and when).
4. **Payment is tracked per restaurant order line.** A household that ordered African and Indonesian has two separate lines; Lalibela can only mark their own portion. Nobody can mark another restaurant's food paid.
5. **The guest immediately sees a receipt** on their RSVP page (`/my-rsvp` and their RSVP link): a green "Paid — African meal x2, confirmed Aug 12" badge with a note to show it at the door for pickup. Unpaid orders keep showing the current "call to pre-pay" instructions with the restaurant's name and phone.
6. **You see everything in admin** — a new Paid column on the existing Meal Pre-orders view, plus totals per restaurant (meals paid / meals outstanding), so you always know who still owes without asking a restaurant.
7. **Restaurants cannot change quantities.** They view and mark paid only. If a guest changes their order on the phone, the guest updates it themselves via "Update RSVP or order", or you adjust it in admin.

## Guardrails

- A restaurant only ever sees the orders for their own cuisine — no other restaurant's guests, and no guest data beyond name, phone, and meal count.
- Nothing is ever deleted by a restaurant. Every mark/unmark is written to the audit log.
- Existing pre-orders and the meal-text tools keep working exactly as they do now; this adds a payment layer on top and changes none of the current counts.

## Technical detail

- **Migration** — new table `public.meal_payments`: `preorder_id` (FK `cuisine_preorders`), `restaurant_id` (FK `restaurants`), `cuisine`, `qty_paid`, `paid_at`, `marked_by_label`, timestamps; unique on `(preorder_id, cuisine)`. Grants + RLS: no `anon` access, `service_role` full; all reads/writes go through server functions. New table `public.restaurant_portal_access`: `restaurant_id`, `code_hash`, `label`, `active`, `rotated_at` (grants: `service_role` only). Reuse the existing `audit_row_change()` trigger on `meal_payments`.
- **Session** — restaurant portal uses an encrypted `useSession` cookie (`SESSION_SECRET`) holding `{ restaurantId }`; timing-safe code comparison inside the server function. This is a shared code gate, not per-user auth, which fits a shared kitchen device.
- **New files** — `src/lib/restaurant-portal.functions.ts` (login, list orders for the session's restaurant, mark/unmark paid), `src/lib/restaurant-portal.server.ts` (Supabase admin queries, code hashing), `src/routes/restaurant.tsx` (login + order list), and admin code management inside `src/routes/_authenticated/admin/restaurants.tsx`.
- **Edits** — `src/components/my-rsvp-content.tsx` and `src/routes/rsvp.$token.tsx` (paid badge/receipt per cuisine), `src/routes/_authenticated/admin/preorders.tsx` (Paid column + per-restaurant totals). Cuisine-to-restaurant matching reuses `normalizeCuisine`/`parseSelections` from `src/lib/preorder-math.ts` so the existing Myanmar/African/Indonesian mapping stays authoritative.
- **Verification** — Playwright at 384x681: log into one restaurant portal, mark a real order paid, read the row back from the database, then open that guest's `/my-rsvp` and confirm the paid badge renders; confirm the other two restaurants cannot see or mark that line.
