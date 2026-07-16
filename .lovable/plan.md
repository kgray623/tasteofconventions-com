## Guest reassignment (2026-07-16 UTC)

Three invitations currently show under Kari Gray's "My Guests" but shouldn't. All three fixes are one-time data updates — no code changes.

### What I found in the database

| Guest | Current host | Current inviter tag | Notes |
|---|---|---|---|
| Rosa Gutiérrez | Kari Gray | (none) | Betsaida Ruiz exists as both a committee member and an inviter. Abel is not a separate record — treated as her spouse. |
| Jennifer Gray | Kari Gray | Tina Santana | Shelley & Pat Monahan exists as a committee member (profile) but has no inviter record. |
| Margie Rice | Kari Gray | Tina Santana | Not linked to any other committee member. Nobody else has her on their list. |

### Changes I will make

1. **Rosa Gutiérrez** → reassign host to **Betsaida Ruiz** and set inviter tag to Betsaida's inviter record. She'll disappear from Kari's list and appear under Betsaida's.
2. **Jennifer Gray** → reassign host to **Shelley & Pat Monahan**. Clear the incorrect "Tina Santana" inviter tag (no inviter record exists for Shelley, so inviter stays blank). She'll appear under Shelley's list.
3. **Margie Rice** → delete the invitation record. The system automatically archives deleted invitations to `deleted_rows_archive`, so the original submission is preserved for audit but no longer counts against Kari or anyone else. Her Pending RSVP row (if any) is also removed with the invitation. This is a reversible archive, not a permanent drop.

### Verification steps I will run after the update

- Re-query `invitations` for all three guests and confirm the new `host_id` / `inviter_id` values.
- Confirm Margie Rice is gone from `invitations` and present in `deleted_rows_archive`.
- Open Kari's committee workspace on mobile viewport and confirm the three names no longer appear under "My Guests".
- Confirm Rosa appears under Betsaida's list and Jennifer under Shelley's.

### If you'd rather NOT delete Margie

Say "keep Margie" and I'll instead leave the invitation in place but strip the incorrect Tina Santana inviter tag, so she still shows on Kari's list but isn't miscounted anywhere else. `host_id` cannot be null in the schema, so keeping the record requires some owner — Kari is the only safe choice unless you name a different committee member.
