## Correction: newest RSVPs always visible (2026-07-27 UTC)

### What's happening now (verified in code)

The admin guest list at `/admin/guests` defaults to **Alphabetical** sorting. The "Latest reply" option exists, but you have to choose it every time. Anyone who just replied — like Jacqueline Graves — stays buried in the A–Z list until you manually switch the sort.

### The change

1. **Default the guest list to "Latest reply."** Opening Admin → Guests (or any status tab: Confirmed, Declined, Pending, etc.) shows the most recently replied guests at the top, without touching a dropdown.
2. **Keep the other sorts.** Alphabetical, Newest first (upload date), and Oldest first stay in the dropdown; choosing one still works and stays in the URL.
3. **Guests with no reply yet** sort after those who have replied, ordered by name, so the pending list stays readable.
4. **Committee view consistency.** The committee guest list already surfaces awaiting-reply guests; replied guests there will also order newest-reply-first so a committee member instantly sees who just responded.

### Verification

- Load `/admin/guests` on mobile (384px) as admin with no sort in the URL and confirm the newest responder is the first card and the dropdown reads "Latest reply."
- Confirm the same ordering holds on the Confirmed and Declined tabs.
- Record a fresh test reply timestamp read-back from the database and confirm that record appears at position 1 on the route.
- Confirm switching to Alphabetical still works and nothing is hidden or dropped from the list.
