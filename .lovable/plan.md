## Change

Add a prominent **Download the app** button to the admin/committee layout header so it's visible at the top of every signed-in admin/committee page (including the Steering Committee "Welcome, Carrie" page).

### Files

1. **New** `src/components/install-app-button.tsx` — a compact, bright button that reuses the same install logic as `install-app-card.tsx`:
   - Listens for `beforeinstallprompt`, fires native install prompt when available.
   - On iOS, opens the existing "Add to Home Screen" instructions sheet.
   - Hides itself once `display-mode: standalone` is detected (already installed).
   - Styled in the bright terracotta brand color so it stands out (`bg-terracotta text-cream hover:bg-terracotta/90`).
   - Label: "Download the app" with a Download icon.

2. **Edit** `src/routes/_authenticated/admin.tsx` — render `<InstallAppButton />` inside the top-right header button row (next to Subcommittee / Log out), so it appears on every admin and committee subpage.

### Why a separate button (not the card)

The user explicitly asked for a button at the top of the page, not the existing card. The card stays on `/my-rsvp` for guests; the button covers admin/committee.

### Not changing

- `install-app-card.tsx` (still used on `/my-rsvp`).
- Install behavior, manifest, or PWA setup.
- Anything outside the admin header.
