## Three fixes to Committee workspace + RSVP flow

### 1. SMS "Send text" button — replace with Copy + Open Messages

In `src/components/committee-workspace.tsx` Pending list (~line 1176), replace the current `<a href="sms:...">` "Send text" anchor with a single button that:

1. Writes the invitation message body to the clipboard via `navigator.clipboard.writeText(body)`.
2. Then sets `window.location.href = "sms:<phone>"` (number only, no `?body=`) to open the native Messages app on the correct contact.
3. Shows a toast: "Message copied — paste into Messages".
4. Graceful fallback if clipboard blocked: toast with the message text and a manual copy affordance.

Button label: **"Copy message & open Messages"** (icon: `Copy`).

This removes the fragile `sms:?body=` encoding that has failed 5 times and gives a one-tap workflow that works on every phone.

### 2. Committee can Edit guests after they confirm

Currently the "My RSVP confirmations" section (~lines 800-845) renders confirmed guests as read-only rows. The pending list already has `<EditGuestButton>` and `<DeleteGuestButton>`.

Add the same `<EditGuestButton guest={guest} onSave={saveGuestEdits} />` and `<DeleteGuestButton guest={guest} onDelete={deleteGuest} />` (and also a "Change RSVP" select allowing switch between in-person/Zoom/party size/decline/clear) to each confirmed row, so a committee member can correct a guest's name/phone/email OR change their RSVP after it's been recorded.

The same edit affordances will also be added to the "My full guest list" rows (~lines 880-905), which are currently also read-only.

No new server functions needed — `saveGuestEdits`, `deleteGuest`, and `setRsvpFor` already exist and enforce ownership.

### 3. Decline flow — offer Zoom as an alternative

**Guest RSVP page** (`src/routes/rsvp.$token.tsx` and `src/routes/rsvp.index.tsx`):

When the guest taps **Decline**, before saving, show a soft prompt card:

> "Sorry you can't join us in person. Would you like to attend virtually on Zoom instead?"
>
> [Yes, join by Zoom] [No, decline entirely]

- **Yes, join by Zoom** → flips `status` back to `yes`, `attendance_mode = "zoom"`, `party_size = 1`, continues to save.
- **No, decline entirely** → saves `status = "no"` as today.

This is a UI-only interstitial in the existing RSVP form; no schema changes, no new server functions. The existing `submitRsvp` handles both outcomes.

**Committee manual RSVP dropdown** (~line 1163) stays as-is (a single "Decline" plus explicit Zoom options), because the committee already has direct control there.

---

### Technical notes

- All changes are frontend/presentation only in `src/components/committee-workspace.tsx`, `src/routes/rsvp.$token.tsx`, and `src/routes/rsvp.index.tsx`.
- No DB migrations, no server function changes, no schema changes.
- Verification: Playwright on mobile viewport (384×673) on the exact `/dashboard` committee route and the `/rsvp/<token>` guest route, plus a DB read-back after a test RSVP to confirm `attendance_mode` and `status` land correctly.
- Every update summary will include a UTC timestamp per your standing rule.