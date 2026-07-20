2026-07-20 00:00 UTC — Plan to fix the RSVP “Invited by” field:

1. **Restore fuzzy suggestions, but not the full roster**
   - Reuse the existing fuzzy matching logic in `CommitteePicker`.
   - Change it so an empty field shows **no names at all**.
   - Only after the guest types a name will suggestions appear.

2. **Use the fuzzy picker on both RSVP forms**
   - Replace the plain `Input` currently used for `Invited by` in:
     - `/rsvp`
     - `/rsvp/$token`
   - The field will let guests type a misspelled or partial name and then select the correct suggested person.

3. **Remove misleading labels from suggestions**
   - Do not show everyone by default.
   - Do not label every roster entry as “Guest” in a way that suggests they RSVP’d.
   - If labels remain, use neutral wording only, or remove badges entirely from this RSVP picker.

4. **Keep server validation**
   - Keep the backend rule that the submitted “Invited by” name must match someone in the approved name roster.
   - This prevents random names from being saved while still allowing fuzzy help before submit.

5. **Verify on the exact guest route**
   - Test on mobile viewport against the RSVP page.
   - Type a misspelled name and confirm the correct suggestion appears.
   - Select it and confirm the field stores the corrected spelling.
   - Confirm no roster appears before typing.