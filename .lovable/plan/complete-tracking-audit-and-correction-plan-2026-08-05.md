# Complete tracking audit and correction plan

2026-08-05 05:50 UTC

## Verified failures

- The database currently has two competing ownership fields on guest invitations: `inviter_id` controls referral credit, while `host_id` can control account ownership and older visibility paths. These fields are not aligned on many existing records. Tina has credited guests whose `host_id` points elsewhere, and the same pattern affects other committee members.
- New guest creation is inconsistent: committee/admin guest entry can set both fields correctly, but the public RSVP path creates an unmatched invitation with a generic first-profile `host_id` and initially leaves `inviter_id` empty. A later trigger may fill referral credit, but it intentionally does not repair `host_id`.
- Committee totals already prefer `inviter_id`, but the workspace still returns the entire event guest list and relies on client-side filtering. That leaves multiple opportunities for the two ownership fields to disagree.
- Current referral reconciliation preserves First-Loaded Wins and records duplicate claims, but only one committee member currently has entries in the duplicate ledger. Historical submitted-list conflicts for other committee members are therefore not fully represented there.
- RSVP failures are now logged, but only failures occurring after that logging was introduced are diagnosable. Historical missing submissions cannot be reconstructed from logs that did not exist.
- There is one meal preorder attached to a declined RSVP: Tirzah Corbin has two meal selections while her RSVP is declined. The order must remain retained and visible for review; it must not be silently deleted.
- The current committee rollup query can multiply RSVP household counts and party-size totals when a preorder contains multiple cuisine selections. The final audit will use canonical RSVP aggregation without this join multiplication.

## 1. Establish one canonical relationship chain

Use this chain everywhere:

```text
signed-in user
  -> inviter roster record
  -> invitation.inviter_id (referral owner / First-Loaded Wins)
  -> RSVP by invitation_id
  -> meal preorder by invitation_id
  -> restaurant payment by preorder_id + cuisine
```

- Treat `inviter_id` as the single source of referral credit and committee dashboard inclusion.
- Keep `host_id` for row/auth ownership compatibility, but stop using it to override a non-null `inviter_id`.
- Require every new committee-attributed invitation to carry the resolved `inviter_id` at insert time.
- When a public RSVP names a committee member and creates a new invitation, insert the resolved `inviter_id` and that inviter’s linked `host_id` together. If the referrer is unresolved or ambiguous, retain the submission and flag it for admin review rather than inventing ownership.

## 2. Correct existing relationship gaps without losing history

- Produce a row-by-row exception list for every invitation where credited owner, account owner, auth identity, or referrer text disagree.
- Backfill `host_id` only where `inviter_id` gives an unambiguous linked account. Do not transfer `inviter_id`, because First-Loaded Wins remains authoritative.
- Leave ambiguous rows untouched and expose them in the admin reconciliation/issues view with the guest, submitted referrer, current credited owner, and reason.
- Preserve every invitation, RSVP, preorder, duplicate record, and audit record. No submitted information will be deleted or hidden.
- Backfill the duplicate ledger from verified historical list claims so each committee member can see “Duplicates — credited to someone else,” including the real First-Loaded owner.

## 3. Make dashboard reads deterministic

- Move committee guest filtering into the authenticated server function: return only rows whose `inviter_id` belongs to the signed-in committee member, plus that member’s recorded duplicate claims.
- Use the same canonical filtered set for the committee list, status sections, newest replies, counts, resend controls, and meal-text list.
- Remove fallback behavior that lets a mismatched `host_id` change referral ownership when `inviter_id` is present.
- Keep admin views global, guest views invitation-scoped, and restaurant views cuisine-scoped.
- Ensure all totals use the canonical RSVP math once per invitation/duplicate group; meal selections must not multiply RSVP household or people counts.

## 4. Protect RSVP and meal integrity

- Keep the exact-phone match as the primary RSVP identity match and retain the narrow extra-digit recovery only when name and resolved owner make the match unique.
- Save every valid RSVP even when the typed referrer needs review; log rejection and ambiguity reasons with enough detail for admin follow-up.
- Add an admin-visible integrity section for:
  - unresolved or ambiguous referrers,
  - duplicate phone/name households,
  - RSVP rows without invitations,
  - preorders without invitations,
  - meal orders attached to declined/waitlisted/pending RSVPs,
  - invitations whose `inviter_id` has no linked committee account.
- Keep Tirzah Corbin’s submitted meal order visible and flag it for an explicit organizer decision; do not discard it automatically.
- Verify restaurant totals by cuisine against preorder quantities and payment rows, not against RSVP party size.

## 5. End-to-end role verification

Test the exact live workflows, not just code or compilation:

- **Tina Santana, committee, mobile 384 × 681:** sign in with last name + phone number, open the real committee dashboard, confirm every First-Loaded guest, duplicate, RSVP status, newest reply, reminder link, and meal-text row; verify Jessica Diaz is declined under Betsaida’s ownership, Gisel and Said are confirmed with their retained meal order, Jenni Aguilar is visible as confirmed for three, and Teresa Paiz has an individual resend link.
- **At least one additional committee member with current mismatches:** verify the same list/count/status/meal behavior so the correction is systemic, not Tina-only.
- **Admin:** verify global totals, reconciliation exceptions, duplicate ownership labels, and restaurant order totals.
- **Guest:** submit/update an RSVP through the real public route; read back the invitation owner, RSVP, and optional meal preorder from the database.
- **Restaurant:** sign in with restaurant name + phone-number password, verify cuisine-scoped orders, mark one order paid, and confirm the guest receipt reflects it.
- For each mutation, read back the stored row and the rendered route. Report each role separately; any unavailable credential/session remains explicitly unverified.

## Technical details

- Keep server-side logic in TanStack `createServerFn` and preserve current authentication architecture.
- Use an approved database migration only for forward invariants/triggers; use approved data updates for the existing-row backfill.
- Split runtime helpers out of server-function wrapper files where those files currently violate the thin-wrapper requirement.
- Add focused tests for owner resolution, First-Loaded duplicate visibility, RSVP aggregation without meal-join multiplication, and declined-RSVP meal flags.
- Finish with database integrity queries, selective tests, security linting, and Playwright checks at the exact routes and roles above.