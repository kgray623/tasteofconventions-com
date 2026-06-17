## Plan

1. **Stop client-side totals from silently reading zero**
   - Replace the direct browser reads in the RSVP Totals card with an authenticated server function.
   - This avoids the current permission failures on `inviters`, which are making `RSVP requests`, `RSVPs available`, and `My RSVPs` show zero.

2. **Calculate the event totals from the database accurately**
   - Total seats: fixed at **550**.
   - RSVP requests: sum active committee request/quota amounts from `inviters`.
   - In-person confirmed: sum `party_size` for `yes` RSVPs where attendance is not Zoom.
   - RSVP Zooms: sum `party_size` for `yes` RSVPs where attendance is Zoom.
   - RSVPs available: RSVP requests minus in-person confirmed.

3. **Calculate “My RSVPs” using the same committee identity matching as the workspace**
   - Match the signed-in committee member by user id, phone, and profile/inviter name.
   - Use those matched host ids for:
     - My RSVP request amount
     - My guests uploaded
     - My in-person RSVPs
     - My Zoom RSVPs
     - My RSVPs left

4. **Keep the quota request button working**
   - Move the “request more RSVPs” save action behind an authenticated server function too, so it updates the inviter rows reliably instead of depending on browser table permissions.

5. **Verify against live database numbers**
   - Confirm the totals card displays the current database values: **550 seats**, **280 RSVP requests**, **available = requests minus in-person confirmed**, and the current in-person/Zoom person counts.
   - Confirm the committee preview no longer shows zeros for My RSVPs when that committee member has matched inviter/guest records.

## Technical notes

- Add a new `src/lib/rsvp-totals.functions.ts` with authenticated TanStack server functions.
- Update `src/components/rsvp-totals-card.tsx` to call those functions instead of reading `inviters`, `rsvps`, and `invitations` directly in the browser.
- No database schema change is needed.