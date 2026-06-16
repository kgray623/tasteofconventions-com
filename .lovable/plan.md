## Goal
Reorganize `/admin` overview into clear columns by audience, each showing the funnel: Uploaded → Invitations sent → RSVPs (Yes / No / Maybe / Waitlist / Pending).

## Layout

Three vertical columns (stack on mobile, 3-up on desktop), each rendered as one `Card`:

```text
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ GUESTS          │  │ COMMITTEE        │  │ OPERATIONS      │
│ Uploaded     N  │  │ Uploaded      N  │  │ Duplicate flags │
│ SMS sent     N  │  │ SMS sent      N  │  │ Categories      │
│ ─────────────── │  │ ──────────────── │  │ Preorders (qty) │
│ Yes          N  │  │ Yes           N  │  │ Audit log       │
│ No           N  │  │ No            N  │  │ Recently deleted│
│ Maybe        N  │  │ Maybe         N  │  │                 │
│ Waitlist     N  │  │ Waitlist      N  │  │                 │
│ Pending      N  │  │ Pending       N  │  │                 │
│ ─────────────── │  │ ──────────────── │  │                 │
│ Total RSVPs  N  │  │ Total RSVPs   N  │  │                 │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

Each numeric row links to where you'd act on it (Uploaded/Sent → `/admin/upload`, RSVP rows → `/admin/my-rsvp`, etc.). The current scattered 9-tile grid is removed.

## Definitions (so numbers are unambiguous)

Split by `invitations.is_committee` (false = Guests, true = Committee):

- **Uploaded** — count of `invitations` rows in the bucket.
- **SMS sent** — count where `invite_sent_at IS NOT NULL` (the manual "Mark as sent" flag).
- **RSVP statuses** — join `rsvps` to `invitations`, group by `rsvps.status` within the bucket.
- **Pending** — `Uploaded − (rows with an rsvps row)`; i.e. no RSVP record at all. (Matches the current "Pending invites" tile.)
- **Total RSVPs** — sum of Yes+No+Maybe+Waitlist (responded, excludes Pending).

## Operations column

Keeps the non-audience tiles that already exist: Duplicate flags, Volunteer categories, Food items ordered (qty), Audit log, Recently deleted. Committee-member headcount tile is dropped from here (Committee column replaces it).

## Files touched

- `src/routes/_authenticated/admin/index.tsx` — replace the data-fetching `useEffect` with a single query batch that returns per-bucket counts, and replace the `stats` grid with the 3-column layout. Keep the "Preview dashboards" card and `CommitteeWorkspace` branch unchanged.

No DB migration, no server fn, no route changes.

## What I will NOT do
- No new tables, RPCs, or schema changes.
- No edits to `/admin/upload`, `/admin/my-rsvp`, `/dashboard`, or any guest-facing page.
- No change to the "team / committee headcount" semantics elsewhere (the `/admin/team` page is unchanged).
