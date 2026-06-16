## Change

Add an **RSVPs** tile to the admin dashboard grid in `src/routes/_authenticated/admin/index.tsx`.

- Label: "RSVPs"
- Value: count of rows in `rsvps` (currently 36)
- Links to: `/admin/my-rsvp` (the existing RSVPs admin page)

### Implementation

1. Add `rsvps: 0` to the `counts` state shape.
2. The `rsvps` query is already being fetched (`supabase.from("rsvps").select("invitation_id")`); use `rsvps.length` to populate `counts.rsvps` — no extra round-trip.
3. Insert a new tile in the `stats` array, placed right after "Pending invites" so the flow reads: Guest invitations → Pending invites → RSVPs → … .

### Not changing

- No other tiles, labels, or counts.
- No new routes.
