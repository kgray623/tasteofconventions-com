## 1. Rename "My slot" labels (RsvpTotalsCard)

In `src/components/rsvp-totals-card.tsx`:
- "My slot" → **My RSVP**
- "My quota" → **My Guests**
- "My in-person" → **My In-Person**
- "Mine left" → **My RSVPs Left**

Body copy under that block stays the same (still labels virtual + the "only in-person counts against quota" footnote).

## 2. Committee workspace "My guests" section

In `src/components/committee-workspace.tsx`:

a. Rename the card header `My guests ({myGuests.length})` → **My Guests Uploaded ({myGuests.length})**.

b. Add edit (pen) and delete (trash) buttons to each row in that list. Today the row only has the RSVP badge / record-RSVP selector. New per-row trailing controls:
- **Pen icon button** → opens a dialog with editable fields for `guest_name`, `guest_phone`, `guest_email`. Save calls `supabase.from("invitations").update({...}).eq("id", guest.id)`, toasts on success/error, then reloads via existing `loadGuests`.
- **Trash icon button** → confirms with the existing shadcn `AlertDialog` ("Delete this guest? …cannot be undone."), then `supabase.from("invitations").delete().eq("id", guest.id)`. Reload on success.

Both controls are scoped to "My guests uploaded" only (this is the inviter's own list) — not added to the "Confirmed RSVPs" or full "Guest list" sections.

c. Extend the existing select query to also pull `guest_email`, since edit needs it: change line 135 select to `id,guest_name,guest_phone,guest_email,host_id,rsvps(status,party_size,attendance_mode)`, add `guest_email` to the `CommitteeGuest` type and row mapping.

## Out of scope
- No DB/migration changes — RLS already lets the committee member update/delete their own invitations (same path the dashboard uses).
- No changes to the admin inviters table edit/delete (separate flow, already exists there).
