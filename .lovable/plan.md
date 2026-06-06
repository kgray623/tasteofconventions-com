## Fix Available RSVPs math

On `/admin/upload`, the top stats row currently shows:

- Total RSVPs = 550 (cap)
- Current RSVPs = 20 (sum of `party_size` where `rsvps.status = 'yes'`)
- Requested RSVPs = 65 (sum of inviter quotas)
- Available RSVPs = 550 − 65 = **485**  ← wrong

You want **Available RSVPs to count only actual confirmed RSVPs**, not sent invites / allocated quotas. So with 550 cap and 20 confirmed, Available = **530**.

### Change

In `src/routes/_authenticated/admin/upload.tsx`:

1. The Available RSVPs card (around line 1234) — change formula from
   `quotaPool.total - quotaPool.allocated`
   to
   `quotaPool.total - rsvpAttendingTotal`.

2. The internal `availableRsvps` value (around line 702, used for inviter-side guardrails) — change the same way: base it on `rsvpAttendingTotal` (confirmed yes RSVPs) instead of `quotaPool.allocated`, so anywhere it's used reflects the same "only counted RSVPs count" rule.

No other cards change — Total, Current, and Requested stay as they are. No DB/schema changes.
