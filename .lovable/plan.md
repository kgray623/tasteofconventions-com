
## Goal

Once someone RSVPs, surface a clear "Install the Taste of Conventions app" call-to-action on the post-RSVP screen. Anyone who has not RSVP'd does not see the install prompt. Role (guest / committee / admin) only changes the copy, not the gate.

## What you'll see

1. **After RSVP submit** — on the confirmation/my-RSVP screen, a new card appears:
   - Title: "Install the Taste of Conventions app"
   - Subtitle varies by role:
     - Guest: "Get event updates, menu, and your RSVP in one tap."
     - Committee: "Open your committee workspace from your home screen."
     - Admin: "One-tap access to admin tools and chat."
   - Primary button: **Install app**
   - Secondary: **Maybe later** (dismisses for 7 days via localStorage)

2. **Install behavior**
   - Android/Chrome/Edge: triggers the native install prompt (`beforeinstallprompt`).
   - iOS Safari: opens a short in-page sheet with the Share → "Add to Home Screen" instructions and a small illustration of the share icon.
   - If already installed (display-mode: standalone) → card is hidden automatically.

3. **Where it shows**
   - `/my-rsvp` (the page everyone lands on after RSVP, and the page committee/admin see in the workspace).
   - `/rsvp/$token` confirmation state (right after a guest submits via their invite link).
   - **Nowhere else** — not on `/`, not on `/login`, not on `/share`. Pre-RSVP visitors never see it.

## How the gate works

- Gate = "current user has an `rsvps` row for this event" (any status: yes / no / maybe / waitlist counts as having RSVP'd).
- For the token RSVP flow, gate = "submission just succeeded in this session".
- Role badge (guest vs committee vs admin) read from existing `useAuth` / `useRoles` — only swaps the subtitle string.

## Technical notes

- No new dependencies. Manifest + icons already exist in `public/`.
- New component: `src/components/install-app-card.tsx` — handles `beforeinstallprompt` capture, iOS detection, standalone detection, and the dismiss-for-7-days flag.
- Mount it in `src/components/my-rsvp-content.tsx` (top of the page, above existing RSVP details) and in the post-submit success state of `src/routes/rsvp.$token.tsx`.
- No service worker added — manifest-only installability per the PWA skill (user only asked for "install / save the app", not offline).
- No DB or auth changes. No new routes.

## Out of scope

- No service worker / offline mode.
- No push notifications.
- No App Store / Play Store wrapper.
- No changes to the public homepage or `/share` page.
