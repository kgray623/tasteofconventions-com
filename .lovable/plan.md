## Declined couples + missing "newest RSVP" (2026-07-27 UTC)

### What the database actually shows

The four pairs exist as separate declined records (all Yes/No status = declined, in-person, party of 1):

| Pair | Records found |
|---|---|
| Amy & Kenneth Moore | "Ami Moore" (402-305-8875), "Kenneth Moore" (402-305-8962) |
| Audrey & Joel Burr | "Audrey Eldridge Burhr" (402-639-1212), "Joel Buhr" (402-639-8137) |
| Cindy & Mark Eldridge | "Cindi Eldridge" (402-990-5557), "Mark Eldridge" (402-968-4767) |
| Kenny & Linda Drews | "Kenny Drewes" (402-578-9810), "Linda Drewes" (402-850-3681) |

Jacqueline Graves **did** RSVP: Yes, in-person, party of 2, responded 2026-07-27 02:37 UTC. She doesn't appear as the newest because the guest list's "Newest" sort orders by *upload date* (she was uploaded 2026-05-22), not by *reply date*.

### Change 1 — merge the four declined couples

For each pair, keep the primary record, rename it to the combined name ("Amy and Kenneth Moore", "Audrey and Joel Burr", "Cindy and Mark Eldridge", "Kenny and Linda Drews"), set party size to 2, keep status declined and the earlier responded date.

The second record of each pair is not deleted: it is archived into the existing recently-deleted archive with a "merged into <primary>" reason, so the original submitted name, phone, and RSVP stay visible and recoverable under Admin → Recently Deleted. This keeps the declined totals from double-counting while retaining every submitted detail.

If you'd rather keep both rows visible in the main list instead of archiving the second one, say so and I'll do that instead — but then declines will keep counting them as two separate households.

### Change 2 — surface the newest RSVP replies

Add a "Latest reply" sort option to the admin guest list, ordering by the RSVP responded date (newest first), so anyone who just replied — like Jacqueline Graves — appears at the top regardless of when they were uploaded. Existing "Newest"/"Oldest" (upload date) stay as-is.

### Verification

- Read back all four merged records from the database: combined name, party size 2, status declined.
- Read back the four archived rows to confirm nothing was lost.
- Confirm the declined people total drops by 4 (8 records → 4 households of 2).
- Load the admin guest list on mobile, choose "Latest reply", and confirm Jacqueline Graves is at the top.
