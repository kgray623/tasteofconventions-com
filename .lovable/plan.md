Promote existing guest **Kenda Andersen** (402-296-9922) to the committee.

### Data changes
1. `invitations` row `4b7436b1-...` → set `is_committee = true`.
2. `inviters` → upsert a row for Kenda:
   - `name`: "Kenda Andersen"
   - `phone`: "(402) 296-9922"
   - `quota`: 40 (matches recent committee members)
   - `active`: true

### Effects
- Kenda will be able to sign in by phone and land in the committee workspace.
- She'll appear in committee lists and counts.
- The 550-seat / RSVP totals will include her 40-seat quota.

### Not changed
- No code changes.
- No new user account is created; she signs in by phone the first time (per project login rules).

Confirm and I'll run the data update.