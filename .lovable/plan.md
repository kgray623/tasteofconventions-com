## Retag guests to Tina Santana + fix mislabeled names

Both new screenshots (Bob & Deanna Sadler / Laquita / Latea / Delali & Kodjovi, and the handwritten "Friends to Invite" list) are already covered — those phone numbers are in the DB, and the Sadler/Laquita/Latea/Delali/handwritten-list guests are already tagged to Tina. The 10 rows below are the only ones from your combined set that aren't tagged to her.

Tina's inviter row: `d52a0902…` (quota 25, kept as-is per your call — extra "yes" RSVPs beyond 25 will auto-waitlist).
Tina's user id (host_id): `00651c0f…`.

### 1. Reassign these 10 invitations to Tina

Set `inviter_id` → Tina's inviter and `host_id` → Tina's user for each row:

| Phone | Guest | Currently tagged to |
|---|---|---|
| 402-676-1298 | Brittany Avery *(name fix below)* | Kari Gray |
| 402-298-6695 | Faviola & Israel Gamino family *(name fix below)* | Kari Gray |
| 402-378-5424 | Jackie Williams *(name fix below)* | Kari Gray |
| 402-917-4152 | Margaret Gibson *(name fix below)* | Kari Gray |
| 402-598-6777 | Whitney Hopkins *(name fix below)* | Kari Gray |
| 402-297-5224 | Jennifer Gray | other host, no inviter |
| 402-981-5972 | Gina Moore | other host, no inviter |
| 402-990-8704 | Margie Rice | other host, no inviter |
| 402-290-6120 | Jessica Diaz | other host, no inviter |
| 904-442-4513 | Jacqueline Graves | Tina's user, no inviter |

### 2. Rename mislabeled rows to match the screenshots

Existing DB rows have the wrong name on these phone numbers. Update `guest_name` to what the SMS screenshots show:

| Phone | Current name | New name (per screenshot) |
|---|---|---|
| 402-676-1298 | Jackie Williams | Brittany Avery |
| 402-917-4152 | Brittany Avery | Margaret Gibson |
| 402-598-6777 | Margaret Gibson | Whitney Hopkins |
| 402-378-5424 | Gamino | Jackie Williams |
| 402-298-6695 | Faviola Israel | Faviola and Israel Gamino family |

### 3. Verification

After the update, re-query `invitations` for these 10 phone numbers and confirm every row shows `inviter_id = d52a0902…` (Tina), `host_id = 00651c0f…`, and the corrected `guest_name`. Confirm the count of invitations tagged to Tina rises from 25 → 35, and Kari Gray drops from 6 → 1.

### Technical notes

- Two `UPDATE` statements via the data tool (one retag, one rename), keyed on `guest_phone_normalized` scoped to the event.
- No schema change, no code change, no migration.
- Nothing is deleted; the 5 renamed rows keep their RSVPs, tokens, and history — only `guest_name` changes.
