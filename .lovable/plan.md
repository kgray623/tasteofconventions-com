Trim the Team page and rename two tabs.

## Tab renames (src/routes/_authenticated/admin.tsx)
- "Team access" → "Add Team"
- "Assignments" → "Volunteer" (admin label; the committee teamLabel is already "Volunteer")

## Team page cleanup (src/routes/_authenticated/admin/team.tsx)
- Remove the entire "Steering Committee" roster card (already shown on the Committee tab).
- Keep the "Add Steering Committee Member" form at the top (admin only).
- Rename the lower card "Pending & past invites" → "Pending invites".
- In that list, hide anyone already accepted: filter out invites where `accepted_at` is set OR their phone number is in `signedUpDigits` (matched by last-10-digit tail, same logic used above). Only people still awaiting signup remain — e.g. Jen Spears, Rhonda Wilcher.
- Drop now-unused state/fetches: `inviters`, `committeeGuests`, the roster-building imports (`buildCommitteeRoster`, `normalizeRosterPhone` if no longer used after the filter — keep `normalizeRosterPhone` since the pending filter still needs it), and the related Supabase queries in `load()`.
- Keep `signedUpDigits` and `fetchSignedUpDigits` so the pending filter can exclude people who've already signed up.