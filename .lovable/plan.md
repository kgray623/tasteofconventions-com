Plan timestamp: 2026-07-14 UTC

Fix the RSVP seat math where the Upload Guests page is showing `550 - my confirmed in-person guests` instead of `550 - everyone’s confirmed in-person guests`.

Scope:
- Keep the guest list filtered to only the current committee member’s uploaded guests.
- Change the top seat-total cards on `/admin/upload?view=committee#add-guests` so event-wide seat math is used:

```text
Total seats: 550
Confirmed in-person: everyone’s confirmed in-person RSVP people count
Requested RSVP quota: everyone’s allocated quota
Seats available: 550 - everyone’s confirmed in-person RSVP people count
```

Implementation details:
- Add separate event-wide RSVP totals state on the Upload Guests page.
- When the selected event loads, fetch all invitations/RSVPs for that event only for the totals calculation, while leaving the visible saved guest list restricted to the logged-in committee member.
- Reuse the existing duplicate-aware RSVP rollup logic so duplicate guest entries do not inflate confirmed seat usage.
- Update `availableRsvps` to subtract the event-wide confirmed in-person count, not the current member’s count.
- Avoid changing the “My guests uploaded” list ordering/filtering from the previous request.

Verification before reporting back:
- Check the exact route `/admin/upload?view=committee#add-guests` at the current preview viewport.
- Verify as a committee user that the list still shows only that user’s guests.
- Verify the cards show event-wide confirmed in-person seats and `Seats available = 550 - event-wide in-person confirmed`.
- Verify the RSVP totals card still shows “My RSVPs” first and “Everyone” totals below it.