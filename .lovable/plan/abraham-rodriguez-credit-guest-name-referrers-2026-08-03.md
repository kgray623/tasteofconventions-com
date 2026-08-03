# Abraham Rodriguez credit + guest-name referrers

2026-08-03 14:50 UTC

## What I found in the database

- There is no committee member named Jennifer Fuentes. The closest record is **Jenny Fuentes (402-860-2103)** — a *guest*, not committee, brought by **Betsaida Ruiz**, with no RSVP of her own yet.
- **Abraham Rodriguez (707-628-9800)** has a Yes RSVP for 2 people, referrer text "Jennifer Fuentes", and no committee owner. That is why he shows up under "Replies that didn't stick".
- Carol Torres: no action taken. Her invitation stays as-is until she replies.

## What will change

1. **Credit Abraham to Betsaida Ruiz.** His RSVP keeps the exact words he typed ("Jennifer Fuentes"), and his invitation is linked to Betsaida Ruiz so he appears on her committee list. Nothing is overwritten — his invitation currently has no owner, so First-Loaded Wins is not in play.
2. **Guest names become a valid answer to "Who invited you?"** When the typed name matches a guest already on the list, credit rolls up to the committee member who brought that guest, and the reply is saved without landing in the review queue. Committee names keep working exactly as they do now. If the typed name matches nothing, or matches more than one person, it still saves and still flags for review — no reply is ever refused.
3. **Show the chain in the admin view.** On the guest roster and on "Replies that didn't stick", a guest-referred entry reads like "Referred by Jenny Fuentes · credited to Betsaida Ruiz" so the path is visible at a glance.
4. **Clear Abraham off the review list** once credited, so the page reflects a true zero-outstanding state.

## Technical notes

- Data fix: set `invitations.inviter_id` for Abraham's invitation to Betsaida Ruiz's `inviters.id` (leave `rsvps.invited_by` text untouched).
- Resolution logic: extend `public.resolve_referral_inviter_id` and `public.count_referral_matches` with a final step — when the normalized name matches guest rows, resolve to that guest's own `inviter_id` (the committee owner), only when exactly one distinct owner results. This keeps the existing `link_invitation_inviter_from_rsvp` trigger and its First-Loaded-Wins guard unchanged: it still only writes when the invitation has no owner.
- Mirror the same guest-rollup step in `resolveInvitedBy` in `src/lib/invitations.functions.ts` so the server function and the trigger agree, and record the rollup path in the audit metadata (`resolved_via: 'guest_rollup'`).
- Update `src/lib/rsvp-issues.functions.ts` / `src/routes/_authenticated/admin/rsvp-issues.tsx` and the roster label in `src/routes/_authenticated/admin/guests.tsx` to render the referrer → credited-to chain.

## Verification

- Read back Abraham's invitation and RSVP from the database to confirm the owner is Betsaida Ruiz and his typed text is intact.
- Open `/admin/rsvp-issues` and `/admin/guests` at 384px as a signed-in admin and confirm Abraham shows under Betsaida with the chain label and the review queue reads zero.
- Submit a test RSVP naming a guest to confirm it saves, credits the guest's committee owner, and does not flag for review; then confirm a nonsense name still saves and still flags.
