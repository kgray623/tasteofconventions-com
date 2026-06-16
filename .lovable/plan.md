## Change

On `/login`, replace the "Your name (as it appears on the invitation)" field with a **Last name** field. Phone field stays as-is.

### Why this works

The server-side name check (`namesMatch` in `src/lib/auth-phone.functions.ts`) already tokenizes the submitted name and matches if **any** token matches any token in the invitation's stored name. So submitting just "Gray" will match an invitation for "Tara Gray". No server changes needed.

### Edits (frontend only, `src/routes/login.tsx`)

1. Field label: "Last name"
2. Placeholder: "Gray"
3. `autoComplete="family-name"`
4. Helper line under the heading: "Enter your mobile number and the last name on your invitation."
5. Validation message: "Enter the last name on your invitation"
6. Variable `name` stays — we just send the last name as the `name` value to the server fn.

### Phone with leading 1

Already handled — `normalizeMobilePhone` accepts 10 digits, 11 digits starting with 1, or `+1...`. `8082787562` and `18082787562` both normalize to `+18082787562`. No change required.

### Not changing

- Server function, DB, or matching logic.
- "Mark as sent" / RSVP / committee logic.
- The remembered-name session recovery (`rememberLoginName` will now store the last name, which is fine).
