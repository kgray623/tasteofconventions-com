## Verified from the database (2026-07-27 UTC)

**Alma Hauz** (402) 968-4098 is currently attributed to Tina Santana — both the uploader (host) and the "invited by" (inviter) fields point at Tina. Marked as texted 2026-06-19.

**Tina's guests with no "texted" date — 6:**

| Guest | Phone | RSVP |
|---|---|---|
| Brittany Avery | 402-676-1298 | none yet |
| Faviola and Israel Gamino family | 402-298-6695 | none yet |
| Jackie Williams | 402-378-5424 | none yet |
| Margaret Gibson | 402-917-4152 | Yes |
| Whitney Hopkins | 402-598-6777 | Yes |
| Sharon Allison | 402-709-7164 | Declined |

So only 3 actually still need an invite text; the other 3 already replied even though the sent flag was never set.

## Proposed change

1. Reassign **Alma Hauz** from Tina Santana to **Kari Gray** — set both her uploader and "invited by" to Kari's committee record. This moves her out of Tina's 35 (Tina drops to 34) and into Kari's list. No RSVP, phone, or contact data is touched or deleted.
2. No other guest is changed.

## Technical notes

- One migration updating `public.invitations` row `c2da937c` : `host_id` → Kari's host id, `inviter_id` → Kari's `inviters.id`.
- Change is captured by the existing audit trigger, so it stays in the audit log.

## Verification before I call it done

Read back the row to confirm it points at Kari, then sign in as Tina on mobile at `/admin/subcommittee` and confirm her count reads 34 with Alma no longer listed, and confirm Alma appears under Kari's guests.
