## Make "Invited by" required on RSVP forms and ensure alphabetical order

### What

1. **Alphabetical order**
   - The `get_public_inviters` RPC already returns inviters sorted by name (`ORDER BY name`), so new names will appear in alphabetical order automatically.
   - As a safety net, sort the inviter list client-side after fetching in both `src/routes/rsvp.index.tsx` and `src/routes/rsvp.$token.tsx` (case-insensitive sort by name).

2. **Require "Invited by" before accepting RSVP**
   - `src/routes/rsvp.index.tsx` (`handleSave`): block submit and show a toast ("Please select who invited you") if `invitedBy` is empty, or if `invitedBy === "__other__"` and `invitedByOther.trim()` is empty.
   - `src/routes/rsvp.$token.tsx` (`handleSubmit`): same validation before calling the server function.
   - Mark the field as required visually: append a red asterisk to the "Invited by" label on both forms.

### What is not changing

- No backend / database / server function changes. Validation lives on the client form layer where the existing toast pattern already lives.
- Other fields, layout, copy, and RSVP/waitlist logic remain untouched.
