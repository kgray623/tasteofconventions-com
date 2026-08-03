# Load the three restaurant contacts

Add the real restaurant names, phone numbers, and websites so the meal-text tool and the guest-facing meal cards show who to call.

## What gets loaded

| Cuisine | Name shown | Phone | Website |
|---|---|---|---|
| Myanmar / Burmese | Burmese (name unchanged — no listing given) | (402) 614-8966 | none yet |
| African | Lalibela Restaurant (Ethiopian) | (402) 991-5662 | lalibelaomaha.com |
| Indonesian | Koen Japanese BBQ & Izakaya | (531) 213-2708 | koenblackstone.com |

## Changes

1. Database: add a `website` column to the restaurants table (currently only name, description, phone).
2. Data: set phone + website + display name on the three restaurant rows.
3. Meal texts page (`/admin/meal-texts`): phones now prefill automatically, so the three "Send group" buttons and every per-household text include the restaurant name and number. Website added to the editable template as an optional `{restaurant_website}` token.
4. Guest-facing meal cards (RSVP / My RSVP / preorder / invitation page): show the restaurant name as a bold heading with a tappable phone number and website link under the existing photos and pricing text.
5. Admin → Restaurants: add a website field next to the existing phone field so you can edit these yourself later.

## Notes

- Both Google share links you sent were the same URL, so the Burmese restaurant name/website is still unknown — I'll load its phone only and leave the label "Burmese" until you send the listing.
- Nothing about pricing, order minimums, or the 50-order Indonesian hold changes.

## Technical detail

- Migration: `ALTER TABLE public.restaurants ADD COLUMN website text`.
- Data update via insert tool on the three rows.
- Edits: `src/lib/meal-texts.functions.ts` (template token + website in payload), `src/routes/_authenticated/admin/meal-texts.tsx`, `src/routes/_authenticated/admin/restaurants.tsx`, `src/components/my-rsvp-content.tsx`, `src/routes/rsvp.$token.tsx`, `src/routes/preorder.tsx`, `src/routes/restaurants.tsx`.
- Verification: read the three rows back, then load `/admin/meal-texts` and an RSVP page at 384px as admin and confirm the numbers/links render and the SMS links contain them.
