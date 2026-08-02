## What is actually broken (verified in the database and code, 2026-08-02 22:4x UTC)

Two separate defects, both confirmed:

**1. Signing up as a volunteer is blocked by the database rules.**
The "I'll help" button (`/admin/categories`) inserts a row with `volunteer_name = null`. The current insert rule on `category_assignments` requires `volunteer_name` to be NOT NULL **and** to exactly equal the person's stored display name. So every self sign-up is rejected and the person sees an error toast. This was introduced by the recent name-spoofing security fix.

**2. Regular guests can't even open the volunteer page.**
Volunteer categories live at `/admin/categories`, which is gated to admin/committee only. A guest who taps "Browse volunteer opportunities" from their dashboard is redirected to `/my-rsvp`. Additionally, the read rule on `category_assignments` allows only admin/committee, so a guest can never see what they signed up for.

## Fix

**A. Server-side volunteer sign-up (no RLS guessing)**
- New `src/lib/volunteer.functions.ts` (thin wrapper) + `src/lib/volunteer.server.ts` helpers:
  - `volunteerSignUp({ categoryId })` — auth-required; resolves the caller's real name from their profile/invitation server-side (so no spoofing), refuses duplicates, writes the row with elevated access after verifying the caller.
  - `volunteerWithdraw({ assignmentId })` — only removes the caller's own row (admins can remove any).
  - `listMyVolunteerRoles()` — returns the caller's own categories + names, so a guest can see their own sign-ups without widening table reads.
- Keeps the anti-spoof guarantee: the name is derived on the server, never accepted from the browser.

**B. Database rules**
- One migration: replace the impossible self-insert rule with one that permits `user_id = auth.uid()` with a server-derived name (null allowed, since name is resolved from profile), and add a read rule so a person can read **their own** assignment rows. Admin/committee read stays as-is. Grants re-confirmed for `authenticated` / `service_role`.

**C. A volunteer page guests can reach**
- New public-facing route `/volunteer` (signed-in guests, committee, and admin all allowed) listing every category with description, current volunteer count, and a working **"Count me in" / "Withdraw"** button using the server functions above.
- Point the dashboard "Browse volunteer opportunities" link and the invitation-page volunteer callout at `/volunteer` instead of `/admin/categories`.
- `/admin/categories` keeps the full admin view (assign anyone, remove, chat) and its own "I'll help" button switches to the same server function so it works for committee members too.

**D. Verification before I call it done**
- Playwright on a 384px mobile viewport, as three separate signed-in users (admin, committee, plain guest): open `/volunteer`, sign up, reload, confirm the role persists, withdraw, confirm removal.
- Database read-back after each step to prove the row exists with the correct name and `user_id`.
- Confirm `/admin/categories` still shows the same person and that Volunteer chats appear for them.

Nothing existing is removed: current categories, assignments, chats, and admin tools all stay.
