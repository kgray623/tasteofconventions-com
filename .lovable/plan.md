# Restaurant portal: sign in with the restaurant's phone number

Right now each restaurant needs an admin-set access code. Change it to match how everyone else logs into this platform: username = restaurant name, password = the restaurant's own phone number.

## How it will work

1. On `/restaurant`, the second field becomes **Phone number** (was "Access code"), with placeholder `(402) 991-5662` and a hint that it's the restaurant's own phone number on file.
2. Sign-in succeeds when the typed number matches the phone on file for that restaurant, comparing digits only (last 10 digits), so `(402) 991-5662`, `402-991-5662`, and `4029915662` all work.
3. Current phones on file that will work immediately:
   - Burmese (Myanmar) — (402) 614-8966
   - Koen Japanese BBQ & Izakaya (Indonesian) — (531) 213-2708
   - Lalibela Restaurant (African) — (402) 991-5662
4. Any access code already set keeps working as an alternate password, so nothing that exists today breaks. Nothing is removed.
5. Admin → Restaurants keeps the access-code panel and now also shows the phone number each restaurant can log in with, so you can read it off to them.
6. Failed sign-in message becomes: "That restaurant name or phone number isn't right."

## Technical detail

- `src/lib/restaurant-portal.server.ts`: add a `phoneMatches`-based check (reuse `phoneTail` from `@/lib/phone`) against `restaurants.phone`; keep `codeMatches` as a fallback.
- `src/lib/restaurant-portal.functions.ts`: in `restaurantPortalLogin`, accept the credential, try phone match first, then the `restaurant_portal_access.code_hash` path; relax the input validator label from `code` to a generic `code` string (min 4) so the client can send digits. No table changes, no migration.
- `src/routes/restaurant.tsx`: relabel the field, `type="tel"` + `inputMode="tel"`, update the error toast.
- `src/routes/_authenticated/admin/restaurants.tsx`: surface each restaurant's login phone in the access panel.
- Verification: Playwright at 384x681 — sign in to Lalibela with `4029915662`, confirm the order list renders, then confirm a wrong number is rejected.
