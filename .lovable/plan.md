## Plan

1. **Fix phone matching in login**
   - Update the phone-login lookup so invited guests match by the last 10 digits too, not only the exact stored normalized value.
   - This covers values like `8082787562`, `18082787562`, `+18082787562`, and formatted phone numbers.

2. **Make inviter lookup consistent**
   - Adjust inviter matching so it also uses digit-normalized comparison instead of exact raw text matching.

3. **Keep the current name requirement**
   - No password or OTP changes.
   - Last name remains required and must match the invitation.

4. **Verify the specific screenshot case**
   - Confirm `Gray` + `8082787562` can find Kari Gray’s invitation record before sign-in continues.

## Technical notes

- The screenshot phone number exists in the database as `Kari Gray` with `guest_phone_normalized = 8082787562`.
- The safest fix is to broaden the database predicates in `src/lib/auth-phone.functions.ts` around the invitation/inviter/team-invite lookup, without changing the authentication model or adding quotas.