## Add "Send text" button on committee Pending list

Committee view (`/admin?view=committee`) → "My guests" card → **Pending** group currently shows each pending guest with name/phone/edit/delete, but no way to launch the phone's Messages app. The upload page already has that pattern — reuse it here.

### Changes

1. **`src/lib/rsvp-totals.functions.ts`** — add `rsvp_token: string | null` to `CommitteeWorkspaceGuest` type and include `rsvp_token` in the select in `getCommitteeWorkspaceGuests`, so the workspace has what it needs to build the RSVP link.

2. **`src/components/committee-workspace.tsx`** — 
   - Add a small helper (same shape as `buildSmsBody` in `upload.tsx`): `Hi <first name>, it's <inviter first name>. You're invited to A Taste of Special Conventions on Sunday, August 30, 2026. Please RSVP here: <origin>/rsvp/<url-safe token>`.
   - Get the inviter/sender name from the current user (component already loads guests; pull display name from profile/user metadata like `upload.tsx` does).
   - In `MyGuestsGroup`, when `label === "Pending"` AND `guest.guest_phone` is present AND `guest.rsvp_token` exists, render a **Send text** button (anchor with `href="sms:<phone>?&body=<encoded body>"`). Icon: `MessageSquare` from lucide. Placed before the Edit button. Full-width on narrow screens (`w-full sm:w-auto`) so it's easy to tap on mobile.
   - No auto-marking "sent" — committee already marks that separately on the upload page. This button only opens the phone's Messages app.

### Out of scope

- No changes to Confirmed, Declined, or non-pending lists.
- No changes to counts, RSVP logic, or admin-only views.
- Does NOT auto-flip `invite_sent_at`; that stays a manual toggle on the upload page.

### Verification

Playwright at mobile viewport (390×844), sign in as a committee member with pending guests, open `/admin?view=committee`, expand "Pending", screenshot to confirm the "Send text" button renders next to each pending row with a phone number, and that its `href` starts with `sms:` and contains the RSVP URL.
