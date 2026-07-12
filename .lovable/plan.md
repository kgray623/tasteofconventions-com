## Add "Send SMS" button on each guest row

The `/admin/upload` guest list already has `buildSmsBody(name, token)` producing the invitation text with the RSVP link, plus a "Mark as sent" checkbox. It's missing the actual send button — right now the invitation flow is: copy text somewhere, send, then tick the box. We'll close that gap.

### Change

On each saved-guest row in `src/routes/_authenticated/admin/upload.tsx`, add a **Send SMS** button (next to the RSVP + "I sent the text" controls):

- Only shown when `g.guest_phone` exists (rows without a phone keep the existing "no phone" state and just the manual checkbox).
- Renders as an `<a>` with `href={\`sms:${phone}?&body=${encodeURIComponent(buildSmsBody(g.guest_name, g.rsvp_token))}\`}` — opens the phone's Messages app with the recipient and prefilled body (RSVP link included).
- On tap (`onClick`), if `!g.invite_sent_at`, call the existing `toggleSent(g, true)` so the row auto-flips to "Text sent {date}". Non-blocking — the sms: link still fires.
- Label: "Send SMS" when not yet sent, "Resend" when already sent (still allowed).
- iOS/Android `sms:` body separator quirk: use `?&body=` (works on both) — matches what the codebase already assumes.

### Where

Only `src/routes/_authenticated/admin/upload.tsx`, inside the row action cluster around line 1802 (right before the "I sent the text" checkbox). No new server functions, no schema change, no changes to `/admin/guests` (that page is a read-only reconciliation view).

### Out of scope

- No automated sending (project rule: SMS is always sent from the committee member's own phone).
- No changes to the message copy — `buildSmsBody` is unchanged.
- No 7-day expiry / re-send scheduling.

Timestamp: 2026-07-12 UTC.