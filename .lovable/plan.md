Add **Thomas Sturm — (402) 830-4907** to the guest list with a confirmed **Yes / Virtual (Zoom)** RSVP for A Taste of Special Conventions.

No matching invitation exists today, so this creates one and its RSVP in a single step.

## Database changes
- Insert into `invitations`: guest_name `Thomas Sturm`, guest_phone `(402) 830-4907`, event = A Taste of Special Conventions, host = default admin host.
- Insert into `rsvps` for that invitation: status `yes`, attendance_mode `zoom`, party_size `1`, responded_at now.

## Not included
- No inviter linked (you didn't specify who invited him). If he should be tied to a specific committee member/inviter, tell me the name and I'll set `inviter_id` and `invited_by` in the same migration.
- No SMS sent (project rule: never auto-send).

Approve to apply.