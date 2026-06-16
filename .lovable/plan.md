Surface the RSVP quota tally on the admin and committee dashboards so everyone can see, at a glance, how many seats are still available.

## What appears

A new "RSVP totals" card pinned near the top of both dashboards.

Event-wide totals (admin sees on `/admin`, committee members see on their dashboard):
- Total seats requested by the committee (sum of every active committee member's quota — currently 550)
- RSVPs confirmed so far (sum of party_size where RSVP status = yes)
- Seats still available (requested minus confirmed; never negative)
- A small reminder line: "Invites are not RSVPs. To get 40 RSVPs you'll usually need to text many more people — keep inviting until your quota fills."

My personal totals (committee dashboard only, shown next to the event totals):
- My quota (their inviters.quota, e.g., 40)
- My confirmed RSVPs (yes-seat count for invitations under their host_id)
- My remaining

## Where it goes

1. `/admin` (admin index) — add the new card above the existing "Guests" stats card so the admin sees the headline number first.
2. `/admin/subcommittee` (committee dashboard) — add the same card at the top, right under the welcome video, before "My guests". Each committee member sees the event-wide numbers plus their own personal slot.

## Behavior

- Pulls live counts from `inviters` (quota, active) and `rsvps` (status, party_size).
- Refreshes whenever the page loads and whenever a new RSVP is recorded (Realtime subscription on `rsvps`).
- Visual emphasis: large numeric display for the three event totals; subtle progress bar showing % filled toward the 550 quota.

## Out of scope

- No schema changes.
- No change to the existing `/admin/upload` quota tools — those keep working.
- No change to how quotas are assigned or how RSVPs are recorded.