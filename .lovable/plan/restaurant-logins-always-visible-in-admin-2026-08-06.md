# Restaurant logins, always visible in Admin

Right now the three restaurant logins only exist in the database, so you have to ask me for them. This puts them on screen where you can read or copy them any time.

## The logins (current, 2026-08-06 20:02 UTC)

Sign-in page: **tasteofconventions.com/restaurant**

| Cuisine | Username | Password (their own phone) |
|---|---|---|
| Myanmar / Burmese | Burmese | 4026148966 — (402) 614-8966 |
| Indonesian | Koen Japanese BBQ & Izakaya | 5312132708 — (531) 213-2708 |
| African | Lalibela Restaurant | 4029915662 — (402) 991-5662 |

The username is name-tolerant: `Koen`, `Lalibela`, or the cuisine word also works. The password accepts dots, dashes, parentheses, or plain digits.

## What gets added

On **Admin → Restaurants**, each restaurant row gets a "Portal login" block showing:

1. The sign-in URL.
2. Username (the restaurant's name).
3. Password (their phone number on file), shown in plain digits.
4. A **Copy login** button that copies a ready-to-send message, e.g.
   "Sign in at tasteofconventions.com/restaurant — Username: Lalibela Restaurant — Password: 4029915662"
5. A **Text it to them** button that opens Messages to that restaurant's number with the same message prefilled.

If a restaurant has no phone on file, the block says "Add a phone number to enable their login" instead of showing a blank password.

Nothing about the sign-in logic changes — this is display only, reading the existing name and phone.

## Technical detail

- Edit `src/routes/_authenticated/admin/restaurants.tsx` only: render the login block per restaurant from the existing `listRestaurantAccess` data (already returns `id`, `name`, `cuisine`, `phone`).
- Reuse `phoneTail`/digit normalization from `@/lib/phone` for the plain-digit password, and the existing `SmsTextButton` for the text handoff (same behavior as the meal-text pages, including the preview-frame notice).
- Verification: load `/admin/restaurants` in a real browser at 384px as admin, confirm all three logins render with the right digits, then sign in at `/restaurant` with one copied credential to prove it works end to end.
