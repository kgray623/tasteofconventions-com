# Correct Debra Waters’s RSVP and make Zoom unmistakable

2026-08-04 02:52 UTC

## Confirmed current state

- Debra Waters is correctly connected to Angela Waters.
- Debra’s saved RSVP currently says **Declined**, party of **1**, with a stale **in-person** attendance value.
- Both the public RSVP form and invitation-link RSVP form contain a Zoom option, but the current two-step layout can make it easy to miss while changing an RSVP for someone else.

## Changes

1. Correct Debra Waters’s existing RSVP to **Attending virtually (Zoom)**, party of **1**, with no meal-order flag.
2. Keep Debra credited to Angela Waters; do not alter either person’s identity, invitation, or referral relationship.
3. Update both RSVP entry routes so the first decision clearly offers three direct choices: **In person**, **Zoom**, and **Decline**. Selecting one will set both RSVP status and attendance mode together, preventing a declined response from retaining a misleading in-person value.
4. Preserve all current RSVP details and meal behavior for everyone else.

## Verification

- Read Debra’s row back from the database and confirm: accepted, Zoom, party of 1, credited to Angela Waters.
- Test the public RSVP route and token RSVP route at the exact **384 × 681 mobile viewport**.
- Submit a Zoom RSVP through each route and read it back from the database.
- Confirm the signed-in **My RSVP** screen displays **Attending virtually (Zoom)** and does not show in-person meal controls.

## Technical details

- Data correction: `public.rsvps` row linked to Debra Waters’s invitation.
- UI routes: `/rsvp` and `/rsvp/$token`.
- Submission functions already accept `attendance_mode: "zoom"`; no schema change is expected.