Reassign Margie Rice's invitation from Kari Gray to Tina Santana.

## Change
- Update `invitations` row for Margie Rice (`id: c9640917...`):
  - `host_id` → Tina Santana's profile id
  - `inviter_id` → Tina Santana's inviter record id (if one exists; otherwise leave null)

## Verification
- Re-query the row to confirm host/inviter updated.
- Confirm Margie no longer appears on Kari's "My Guests" and does appear on Tina's.