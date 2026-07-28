## Goal
Add Tamara Madlock (531-721-5586) — the only Tamara on the guest list — as a committee member, matching how existing committee members are set up.

## Changes (data only, no code changes)
1. Flag her guest record as committee: set `is_committee = true` on her invitation.
2. Create her committee (inviter) record: name "Tamara Madlock", phone 531-721-5586, active, so she can be picked in "Invited by" and can own guests.
3. Add a pending team invite with the `team` role for her phone, so when she logs in (last name + phone number) she is granted the team role and sees the Committee workspace.

## Verification
- Read back from the database that her invitation is flagged committee, the inviter row exists and is active, and the team invite is present.
- Confirm her name appears in the committee roster used by the "Invited by" picker.
