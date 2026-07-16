## Plan: correct RSVP waitlist/capacity behavior

**UTC timestamp:** 2026-07-16 00:00 UTC

### What will change
- Stop using a committee member/inviter quota to automatically move RSVP “yes” responses to `waitlist`.
- Treat over-quota guests as normal RSVP records: `yes`, `no`, `maybe`, or pending/no response.
- Only allow `waitlist` after the total in-person confirmed attendance reaches the building cap of **550 people**.
- Remove guest-facing “waiting list because your inviter is full” messaging.
- Update public invitation copy so it says in-person space is first-reserved up to 550, not waitlist per inviter quota.

### Database/data handling
- Read current RSVP data before and after the change.
- Existing database check found current attendance is far below the cap: **82 confirmed in-person people**.
- Current RSVP rows include only `yes` and `no`; there are no current `waitlist` rows in the read-back I ran.
- If any `waitlist` rows appear during implementation verification, convert them back to `yes` only if total confirmed in-person attendance is still below 550, so no submitted people are hidden or dropped.

### Logic rule to implement
```text
If RSVP status is not "yes":
  save exactly what the guest selected.

If RSVP status is "yes" and attendance is virtual/Zoom:
  save as "yes"; virtual attendance does not count against the building cap.

If RSVP status is "yes" and attendance is in person:
  count existing confirmed in-person people, excluding this invitation if it already has an RSVP.
  if existing confirmed in-person people + this party size <= 550:
    save as "yes"
  else:
    save as "waitlist"
```

### Files/surfaces to update
- RSVP server function logic in `src/lib/invitations.functions.ts`.
- Public RSVP page toast copy in `src/routes/rsvp.$token.tsx`.
- Public invitation page copy in `src/components/invitation-page.tsx`.
- Any status display that labels `waitlist` should remain available, but it should only be reachable after the 550-person cap.

### Verification before I call it complete
- Submit/read-back behavior will be tested on the RSVP route.
- Confirm in the database that a normal in-person `yes` RSVP below 550 saves as `yes`, not `waitlist`.
- Confirm no existing guest submissions are dropped, hidden, or overwritten.
- Confirm guest-facing text no longer says guests are waitlisted because an inviter quota is full.