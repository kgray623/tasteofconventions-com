## Goal

You can't find the download files. They exist — they live on the **Admin page** in an "Admin exports" card and are served from the private `admin-exports` storage bucket — but the entry point isn't obvious. I'll make the entry point unmistakable and verify every download actually works end-to-end before saying it's done.

## What I'll change (frontend only)

1. **Dedicated `/admin/backups` route** containing the existing 6 download buttons in one focused page:
   - Source code (ZIP)
   - Database migrations (ZIP)
   - Admin screenshots (ZIP)
   - Database dump (ZIP)
   - Database spreadsheet (XLSX)
   - Guests (CSV)
   Each shows file name, last-updated timestamp (from storage metadata), and a download button with a working spinner and clear error message on failure.

2. **Prominent "Download backups" card on the Admin home** (`/admin`) at the top, linking to `/admin/backups`. Keeps the existing in-place card too so nothing moves out from under you.

3. **Admin nav entry** — add "Backups" as a top-level admin nav item (desktop + mobile) so it's reachable in one tap from anywhere in admin.

No backend, schema, RLS, or storage changes. Files stay in the private `admin-exports` bucket, served through the existing authenticated `/exports/$filename` route.

## Verification (before I say it's done)

Using Playwright as a signed-in admin, on both **mobile (390×844)** and **desktop (1280×800)**:
- Open `/admin`, confirm the "Download backups" card is visible above the fold.
- Click into `/admin/backups`, click every one of the 6 download buttons.
- For each: confirm the response is HTTP 200, `Content-Type` matches (zip / xlsx / csv), `Content-Disposition: attachment`, and the response body is non-empty real bytes (not an HTML error page).
- Confirm a signed-out request to `/exports/<file>` returns 401/redirect (still blocked).
- Report file sizes for each download so you can sanity-check them.

If any file is missing from the `admin-exports` bucket, I'll tell you exactly which one and stop — I won't fabricate a placeholder.

## Files touched

- `src/routes/_authenticated/admin/backups.tsx` (new)
- `src/routes/_authenticated/admin/index.tsx` (add the top "Download backups" card)
- Admin nav component (add "Backups" link)
