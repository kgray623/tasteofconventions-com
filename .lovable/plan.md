# Use one-word restaurant usernames

Update the restaurant portal login names so each partner signs in with a single word: **Burmese**, **Koen**, **Lalibela**. Passwords stay the restaurants' own phone numbers.

## Current state

| Cuisine | Current `name` in DB | Desired username | Password (phone) |
|---|---|---|---|
| Myanmar | `Burmese` | `Burmese` | (402) 614-8966 |
| Indonesian | `Koen Japanese BBQ & Izakaya` | `Koen` | (531) 213-2708 |
| African | `Lalibela Restaurant` | `Lalibela` | (402) 991-5662 |

The restaurant portal already uses fuzzy name matching (`findRestaurantByName`), so changing the stored `name` will make the one-word values the canonical usernames.

## Changes

1. **Database**
   - Update `public.restaurants.name` for the Indonesian row to `Koen` and the African row to `Lalibela`. The Myanmar row is already `Burmese`.

2. **Guest-facing display names (decision point)**
   - The same `name` field is used in meal-text templates (`{restaurant_name}`) and the guest/order-confirmed cards.
   - If the full business names should still appear to guests, add a `display_name` column and use it in meal texts / RSVP cards while keeping `name` as the one-word login username.
   - If one-word names are acceptable everywhere, no extra column is needed.

3. **Admin → Restaurants**
   - The page already reads `name` from the DB, so it will reflect the new usernames automatically.
   - The portal-login card already shows the name and phone; it will show the simpler usernames once the data is updated.

4. **Verification**
   - Read the three rows back from the DB.
   - Sign in at `/restaurant` with each one-word username + phone number and confirm the portal loads.
   - Confirm meal-text templates still render with the expected restaurant name.
