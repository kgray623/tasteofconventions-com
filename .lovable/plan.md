I found the admin totals card is now doing the corrected math (`550 - RSVP requests`), but the card can still get stuck showing dashes/no updated numbers because the fetch is guarded by a ref that blocks overlapping reloads and never retries visibly after a failed/slow load.

Plan:
1. Keep the corrected available-seat math as `Total seats - RSVP requests`.
2. Make the RSVP totals load path reliable by removing the over-aggressive “already loading” guard and ensuring every load attempt updates the card when the server function returns.
3. Add a small visible fallback state if totals fail to load, instead of silently leaving blank/dash numbers.
4. Verify the card reads the server totals response currently shown by the backend: `requested: 300`, `confirmed: 40`, `virtual: 5`, so the displayed available value should be `250`.