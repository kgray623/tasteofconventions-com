# Complete guest, RSVP, and restaurant integrity correction

2026-08-05 08:07 UTC

## Verified current state

- Tina Santana has one linked inviter record and one linked sign-in identity with the `team` role. Her 37 currently credited invitation households all have account ownership aligned to that identity.
- Across the full event there are 450 invitation rows: 446 have an inviter credit and four do not. The four uncredited rows are Ami Polite, J'miya Glinn, Jeff/Lorena Dotson & sons, and Heather/Paul/Cynthia Mers; all currently share Mysha Woods' account owner but lack an explicit inviter credit.
- Ten active inviter records do not currently have a committee/admin sign-in role or linked account. Some have no guests yet, but Aisha Moore, Jay Wilcher, Tamara Madlock, and Tirzah Corbin have credited rows that need explicit identity review.
- Two exact-phone duplicate pairs exist across different inviter lists: Dottie & Javan Allen / Dottie Allen, and Lupe Sarske / Lupe Sarski. First-Loaded Wins requires preserving both submitted claims while showing the later claim as credited elsewhere, not deleting either submission.
- There is exactly one RSVP row per invitation; no invitation currently has multiple RSVP rows.
- The restaurant mapping has exactly one active restaurant for each cuisine. Current submitted meal quantities are African 38, Indonesian 59, and Myanmar 49. Active confirmed in-person quantities are African 38, Indonesian 58, and Myanmar 48. The excluded Indonesian and Myanmar meals are Tirzah Corbin's retained preorder attached to a declined RSVP.
- The public RSVP writer already stores the resolved inviter on newly created invitations and updates one RSVP row per invitation. However, several server-function files mix runtime helpers with `createServerFn` declarations, and public reads/writes use a privileged database client at module scope; these paths need to be separated and hardened without changing submitted data.

## 1. Freeze the canonical relationship and preserve every submission

Use one authoritative chain everywhere:

```text
signed-in identity
  -> active inviter record
  -> invitation.inviter_id (First-Loaded referral credit)
  -> one RSVP by invitation_id
  -> one retained meal preorder by invitation_id
  -> restaurant payment by preorder_id + cuisine
```

- Keep `inviter_id` as referral ownership and dashboard membership; keep `host_id` aligned for account/RLS compatibility only.
- Never infer ownership from a caller-supplied user ID. Resolve the signed-in user on the server and map by verified account, exact phone, and unambiguous roster identity.
- Preserve all invitations, RSVP replies, meal selections, duplicate claims, payment history, and audit history. Ambiguous rows remain visible in an admin review queue until explicitly resolved.
- Keep the existing building-cap rule: an in-person Accept remains `yes` below 550 and becomes `waitlist` only when accepting the party would exceed 550. Zoom accepts remain `yes`; Decline always stores `no`.

## 2. Correct current ownership gaps safely

- Produce a row-by-row exception ledger for all 450 invitations before changing data: guest, phone, current inviter, account owner, RSVP, meal order, duplicate status, and proposed action.
- Backfill the four uncredited rows only after confirming their existing Mysha ownership is unambiguous against roster/list history. If any conflict exists, retain the row and place it in admin review rather than guessing.
- Link active inviters to an account/team role only when exact identity evidence is unambiguous. Do not create or merge identities by name alone when names collide.
- Reconcile the two duplicate-phone pairs under First-Loaded Wins: keep the earliest invitation as credited owner, retain the later submitted claim in `referral_duplicates`, and keep its real owner visible to the submitting committee member.
- Re-run the same audit for Tina and every active inviter, not only members currently reporting a problem.

## 3. Prevent new drift and exact-status failures

- Centralize committee identity resolution and phone normalization so login, add-guest, public RSVP, committee dashboard, totals, notifications, and meal-text lists use the same rules.
- Make all invitation creation paths write `inviter_id` and the inviter's linked `host_id` together when the inviter is resolved. Unresolved public submissions still save the RSVP and typed referrer, then appear in review.
- Keep RSVP writes as a single upsert per invitation and read the stored row back before returning success. Verify the stored status, attendance mode, party size, referrer text, and meal flag exactly match the submitted choice or the documented 550-cap result.
- Add database-level invariants for one RSVP and one preorder per invitation where they are not already enforced, plus an integrity audit that surfaces—not deletes—violations.
- Split runtime helpers out of all affected `createServerFn` wrapper files and move privileged client loading inside authorized handlers. Preserve the current phone-number password / last-name username authentication architecture.

## 4. Make every dashboard use the same canonical data

- Return committee guests from an authenticated server query already filtered by that signed-in member's inviter IDs; remove the browser fallback that loads the entire event list and re-derives identity client-side.
- Use one canonical dataset for each member's list, totals, newest replies, pending/declined/confirmed sections, reminder links, notifications, and meal-text list.
- Keep First-Loaded duplicate claims in a separate visible “Duplicates — credited to someone else” section with the real credited owner.
- Add an admin integrity view that continuously lists uncredited invitations, inviters without working identities, ownership mismatches, unresolved referrers, duplicate-phone claims, failed RSVP attempts, and meal/RSVP conflicts.

## 5. Audit and harden all restaurant orders

- Build restaurant totals only from the latest canonical RSVP where status is `yes`, attendance is in person, and the retained preorder has a positive quantity for that restaurant's cuisine.
- Continue retaining declined/pending/Zoom meal submissions for authorized admin review, but exclude them from active restaurant fulfillment totals unless an organizer explicitly changes the RSVP/order.
- Aggregate payment rows by preorder and cuisine, prevent duplicate payment records, and verify the restaurant paid/unpaid totals against guest receipts.
- Audit all three restaurant portals separately: African/Lalibela 38 active meals, Indonesian/Koen 58 active meals, and Myanmar/Burmese 48 active meals based on the current database snapshot. Recalculate after any approved RSVP correction.

## 6. End-to-end verification before any completion claim

- **Tina, committee, 384 × 681:** sign in using last name + phone-number password; verify all 37 currently credited households plus duplicates, statuses, counts, newest replies, SMS links, and meal rows against database read-back. Recalculate the count after reconciliation.
- **Every active inviter:** run an automated identity/ownership/status ledger, then manually test every distinct identity condition (linked, unlinked, phone-format variant, and duplicate claim). Do not claim an untested member is verified.
- **Guest:** on the real public RSVP route, test Accept in person, Accept Zoom, Decline, and an update from one status to another. Read back the single RSVP row after each action and confirm the rendered page/dashboard updates.
- **Admin:** verify global totals and every integrity exception; confirm no submission disappeared from authorized views.
- **Restaurants:** sign into each of the three real portals with restaurant name + phone-number password, compare every row and quantity to the database, mark a test order paid/unpaid, and verify the guest receipt changes accordingly.
- Run selective tests, database integrity queries, security linting, and responsive Playwright checks. Report authenticated, guest, admin, and restaurant verification separately; any unavailable real session remains explicitly `UNVERIFIED`.

## Permanent project rule

Never delete, hide, overwrite, or silently reassign a submitted guest, RSVP, referrer claim, meal selection, or payment. Preserve the original submission and audit history; show it to the submitting user and authorized staff. Apply First-Loaded Wins to referral credit, expose later claims as duplicates with the real owner, and verify every database write by read-back before reporting success.
