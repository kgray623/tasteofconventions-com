Add Rhonda Wilcher as a committee member with phone 402-681-9826.

## Steps

1. Insert a row into `inviters` with:
   - name: "Rhonda Wilcher"
   - phone: "402-681-9826"
   - active: true
   - quota: 40 (default)

2. Insert a row into `team_invites` so she can sign in via phone-only login:
   - name: "Rhonda Wilcher"
   - phone: "402-681-9826"
   - phone_normalized: "+14026819826"
   - role: "team"
   - invited_by: current admin user id

She'll then be able to log in with her phone number and appear in the committee/team list.

## Notes
- No schema changes — data inserts only.
- She becomes a committee member (team role); she is not added to `invitations` since she's an inviter, not a guest.