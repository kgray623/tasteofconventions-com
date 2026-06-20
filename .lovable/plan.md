# Committee message page — rewrite

The page becomes a single-purpose tool: edit a message template, then copy a personalized **login** invite for every member of the committee roster. No stats, no description, no delivery tracking.

## 1. Message is a login invite, not an RSVP

New default template:

```
Hi {{first}}, it's {{sender}}. You're now on the Steering Committee for A Taste of Special Conventions on Sunday, August 30, 2026. Click below to log in to your new dashboard: {{link}}
```

`{{link}}` becomes a single short URL for everyone: `https://tasteofconventions.com/login`. The existing phone-only login already routes each member to the right dashboard based on their phone number, so no per-person token is needed.

Preview box updates to use the same generic link (no more `/rsvp/SAMPLE`).

## 2. Strip the header chrome

- Remove the paragraph "A dedicated in-app message just for committee-tagged guests…"
- Remove all four stat tiles (Committee / Not delivered / Delivered / RSVP'd yes).
- Keep the title "Committee invitation message" and the Message template card (textarea + reset + preview).

## 3. List shows the full 19-member roster, not just 7

Today the list only reads `invitations` where `is_committee=true` (7 rows). It will instead render the same deduped roster that already powers the count (active `inviters` + `team_invites` role=`team` + committee-tagged `invitations`, deduped by phone tail / normalized name, sorted A→Z by name).

For each roster row, show:
- Name
- Status badge: **RSVP'd yes**, **Waitlist**, **Declined**, or **No RSVP yet** — derived by matching the member's phone tail / name against `invitations` + `rsvps`.
- "Copy message" button — copies the rendered template with that member's first name and the generic login link.

Remove from each row: the "Committee" badge, the delivered / not-delivered badges, and the "Mark as delivered" checkbox. (Delivery tracking lived on `invitations.invite_sent_at`, which doesn't exist for inviters/team-invite-only members, and the user said it's not wanted here.)

List header reads "Committee (19)" using `roster.length`.

## Out of scope

- Login route, phone-based redirect logic, or anything in `/login`.
- The roster dedup logic itself (already correct at 19).
- Other admin pages.

## Technical notes

- Drop `rsvp_token`, `invite_sent_at`, `markingId`, `markSent`, the `Checkbox` import, and the `guests` state. The page only needs `roster` and a per-member RSVP status.
- Extend `loadRoster` to return a `Map<memberKey, "yes"|"waitlist"|"no"|null>` so each row can render its status badge without a second query.
- `linkFor` collapses to a constant `LOGIN_URL = "https://tasteofconventions.com/login"`.
- `messageFor(member)` uses `member.name.split(/\s+/)[0]` for `{{first}}`.
