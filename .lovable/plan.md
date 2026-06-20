I found the source of the bad numbers: the Committee Message page is only counting `invitations.is_committee = true`, which currently produces 7 committee records and 4 RSVP'd yes. The broader committee roster used elsewhere includes active inviters, team invites, and committee-tagged invitations; deduped by phone/name it is 19, with 11 matched RSVP'd yes.

Plan:
1. Create one shared committee roster/counting utility for the frontend using the same sources already used on the Committee page:
   - active `inviters`
   - `team_invites` with role `team`
   - `invitations` marked `is_committee`
2. Deduplicate committee members by normalized phone first, then normalized name, so the same person is not counted twice.
3. Update `/admin/committee-message` so:
   - the “Committee” stat shows the full deduped roster count, not just 7 committee-tagged invitations
   - “RSVP'd yes” counts RSVP yes records matched to the deduped committee roster, not just the 4 flagged invitation rows
   - the visible committee guest/message list stays alphabetical
4. Update the committee workspace filter/count if needed so “Committee (x)” uses the same deduped committee identity rules and stays alphabetical.
5. Verify with read-only database checks that the displayed totals match the complete deduped committee roster and RSVP data before reporting back.