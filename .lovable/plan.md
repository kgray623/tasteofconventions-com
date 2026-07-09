## What's happening

The two "unlinked" rows (Jana Weinberger, Yetunde Adejunmobi) came in through the public `/preorder` page. That page inserts into `cuisine_preorders` with just name + phone and **no `invitation_id`** — and it doesn't require an RSVP or a signed-in session at all. So your assumption ("they must have RSVP'd first") isn't enforced by the code today; anyone with the `/preorder` link can submit meals without ever touching RSVP.

Both of these people DO have matching invitations by phone in the database (7854779714 and 4022901113). Nothing ever went back and stitched their preorder to their invitation, so they show up as "unlinked / not counted".

## Fix (two parts, same change)

**1. Backfill the two existing rows.** Match by phone digits to `invitations.guest_phone_normalized` and set `invitation_id`. After this the "Unlinked food orders (need review)" section is empty and their 2 meals roll into the restaurant totals.

**2. Forward-fix so this can't happen again.** Add a `BEFORE INSERT OR UPDATE` trigger on `cuisine_preorders`: when `invitation_id` is null, look up an invitation by normalized phone and set it. Public `/preorder` submissions from a known guest will auto-link; truly unknown numbers still land in the "needs review" list instead of silently linking to the wrong person.

I'm keeping the `/preorder` public route open (some guests use it before RSVPing), but the trigger guarantees any meal from a known phone is attached to their invitation and counted.

## Files touched

- New migration: backfill the 2 rows + create `link_preorder_by_phone()` trigger on `cuisine_preorders`.
- No frontend changes needed — the admin report already reads `invitation_id` and will move the two rows from "unlinked" to "guest preorder details" automatically.

## Out of scope

- I'm not gating `/preorder` behind RSVP in this change. If you want that too (block the submit unless the phone has a "yes" RSVP), say so and I'll add it in a follow-up.