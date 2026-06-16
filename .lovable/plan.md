I will update the committee view so the numbers and labels match the way you described them, and so counts are based on people/party size instead of just invitation rows.

Plan:

1. Fix the RSVP Totals card
- Show the event-wide summary as:
  - Total seats: 550
  - RSVP requests: sum of active committee quotas, e.g. 280
  - RSVPs available: requested quota minus in-person confirmed, e.g. 244
  - In-person confirmations: sum of party sizes for in-person yes RSVPs, e.g. 36
  - RSVP Zooms: sum of party sizes for Zoom yes RSVPs, e.g. 4
- Keep the small NEW badge on the RSVP totals feature only.
- Change the explanatory sentence to: “Only in-person RSVPs count.”
- Replace the awkward “land 52” sentence with cleaner guidance: invite more guests than your request amount because not everyone will RSVP yes.

2. Fix the My RSVP section
- Rename it to “My RSVPs”.
- Show personal metrics using the committee member’s actual data:
  - My RSVP request / requested amount
  - My guests uploaded
  - My in-person RSVP guests
  - My RSVPs left/open
  - My RSVP Zooms
- If uploaded is higher than requested, make it clear, e.g. “57 uploaded · 52 requested,” so it is not confusing.

3. Add quota/request-change control in My RSVPs
- Add a small “Request more RSVPs” control in the My RSVPs area.
- It will write to the existing inviter request fields (`requested_quota`, `quota_request_note`, `quota_requested_at`) so admins can review the request instead of silently changing the approved quota.
- If a request is already pending, show that pending request amount.

4. Fix “New guests RSVP’d” accuracy
- Change this from counting RSVP rows to counting actual guests/people using `party_size`.
- Display both clearly when needed, for example: “21 new guests across 15 RSVP responses.”
- List each new RSVP with name, party size, and mode: “Belsaydia Ruiz — 2 in person”, “Karina Davis — Zoom”, etc.
- Use only the committee member’s own guests.

5. Fix guest row details
- Every RSVP row in the collapsible guest boxes will show:
  - Guest name
  - Committee tag when applicable
  - RSVP status
  - Party size, e.g. “2 in person” or “1 Zoom”
  - Edit and delete icons
- This fixes rows like Gloria Groves, Jamie Elker, Steve and Denise, etc. so party size and Zoom/in-person status are visible.

6. Keep the three collapsible boxes, alphabetized
- RSVP’d
- Awaiting RSVP
- Declined
- Alphabetize each box by guest name.
- Keep each box collapsible.

7. Fix NEW badge placement around edit/delete help
- Remove NEW from the end of the sentence.
- Put it at the start of its own help line: “NEW Use the pencil to edit or the trash to delete the guest.”

8. Remove wrong NEW badges from counts/data
- No NEW badge on “All (57)” or guest counts.
- Keep NEW only beside the Committee filter because that feature is new.
- Do not mark people or data values as new.

9. Fix the preview runtime error if it is caused by the current route chunk
- Clean up any JSX/runtime issue in this touched area while making the changes.
- Verify the committee view loads after the edit.