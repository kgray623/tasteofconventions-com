# Show "referred by" in the notification bell

2026-08-03 15:24 UTC

## What changes

Each new-RSVP line in the bell currently reads:

```text
Jacqueline Graves
Yes — in person · 2 people        3h ago
```

It will read:

```text
Jacqueline Graves
Yes — in person · 2 people
Referred by Tina Santana          3h ago
```

- The referrer is the committee member the guest is credited to (the same "Brought by / credited to" owner shown on the admin guest list), so the bell agrees with the roster.
- When the guest typed a referrer name that rolls up to a committee member through another guest, the line shows the chain: "Referred by *Jenny Fuentes* · credited to *Betsaida Ruiz*".
- When no referrer is on file yet, the line reads "Referrer not recorded" instead of being blank, so an uncredited reply is visible at a glance rather than hidden.
- Layout stays mobile-first at 384px: the timestamp stays right-aligned, the referrer line wraps/truncates rather than pushing it off screen.

Nothing about counts, RSVP data, credit ownership, or the referral rules changes — this is display only.

## Technical notes

- `src/lib/rsvp-notifications.functions.ts`: the invitation select already pulls `inviter_id` / `host_id`; add a lookup of `inviters` (by id, falling back to host_id) plus the guest's own `rsvps.invited_by` text, and return `inviterName` and `referredByText` on each `RsvpNotification`.
- `src/components/notification-bell.tsx`: render the third line from those fields, muted `text-[11px]`, italic for the typed name in the chain form.

## Verification

- Read back a couple of notification rows from the database and confirm the returned `inviterName` matches `invitations.inviter_id` → `inviters.name` for the same guest.
- Open the bell as a signed-in admin at 384px in the preview and confirm the referrer line renders on real rows, matches the admin guest list for those guests, and doesn't break the badge/timestamp layout; repeat as a committee member so scoping is unchanged.
