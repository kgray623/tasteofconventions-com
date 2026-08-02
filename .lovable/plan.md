## What the database says right now (verified this minute)

- Tina Santana inviter record: 1 only (no duplicate inviter rows).
- Invitations credited to her (`inviter_id`): **36 households**.
- Invitations uploaded under her host account (`host_id`): 35 (2 of her credited rows were uploaded by the admin account).
- Overlap rows recorded in `referral_duplicates` (credited to an earlier owner): **6**.
- If couples in the name field count as 2 people, her 36 households = **40 people**.
- RSVPs whose typed "Invited by" says Tina: 8.

So no combination of the current data reaches 54. The gap is real and it is one of three things: (a) lines on her lists that were never entered as invitations, (b) her people sitting under someone else's `inviter_id` or under an unlinked/null owner, or (c) 54 counts individual people while the system counts households.

## Plan

1. **Re-transcribe every screenshot she has sent** (all 12 already provided, plus the second image called out again) into one numbered ledger — one row per line as written, phone as written. No summarizing, no de-duping at this stage.
2. **Match each ledger line against all 388 invitations** by last-10-digit phone, then by normalized name, then by fuzzy name. Record for every line exactly one outcome:
   - credited to Tina,
   - exists but credited to an earlier owner (name the owner and the earlier `created_at`),
   - exists with no owner (`inviter_id` null — 5 such rows exist),
   - not in the system at all.
3. **Fix the two fixable categories**: attach the null-owner rows to Tina where they match her ledger, and create invitations for every ledger line that is genuinely missing, credited to Tina.
4. **Leave earlier-owned rows with their original owner** (First-Loaded Wins) but list each one explicitly under "Duplicates — credited to someone else" so she can see it on her own dashboard.
5. **Produce a printable reconciliation report** — every line numbered, with its outcome and the owner's name — and a matching spreadsheet, so the 54 can be audited against the system row by row.
6. **Verify by logging in as Tina on mobile** (Santana / 402-657-7364) and read back the on-screen counts: owned households, total people, and duplicates. Report the exact numbers, not an estimate.

## One thing I need from you

When you say 54, is that **54 names/people** (couples counted as two) or **54 lines/households** on her lists? The answer changes what "found them all" means. If you can re-send the list images in this thread I will work from those exact images rather than my earlier transcription — that transcription is the most likely place the missing lines were lost.

## Technical notes

Files/objects involved: `invitations.inviter_id`, `public.referral_duplicates`, `public.resolve_referral_inviter_id`, `link_invitation_inviter_from_rsvp` trigger, `src/components/committee-workspace.tsx`, `src/routes/_authenticated/admin/inviters.tsx`. No deletions, no reassignments away from existing owners; every change is logged to `audit_log`.
