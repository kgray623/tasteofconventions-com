## Goal (2026-07-18 UTC)

Close two security findings without breaking any existing feature:

1. **`inviters_public_pii` (error)** — stop exposing committee/inviter names to anonymous visitors.
2. **`SUPA_rls_policy_always_true` (warn)** — record as a false positive.

---

## What changes for guests

The public RSVP pages (`/rsvp` and `/rsvp/$token`) currently show a dropdown listing every committee/inviter name. Guests will instead type the inviter's name into a plain text box. Admins and committee members keep the full inviter list on their own screens — nothing there changes.

## Steps

1. **RSVP forms — replace dropdown with a text field**
   - `src/routes/rsvp.index.tsx`: remove the `useEffect` that calls `get_public_inviters`, drop the `inviters` state and the `<Select>` control, and replace it with a labeled `<Input>` for "Who invited you?" (optional, trimmed, max 120 chars, stored in the existing `invitedBy`/draft field so the submit payload is unchanged).
   - `src/routes/rsvp.$token.tsx`: same swap — remove the `get_public_inviters` fetch and dropdown, keep the text input pre-filled from the invitation's existing inviter name when present.
   - Keep the existing submit path and server function untouched; the field is just a free-text string like before.

2. **Lock down the public listing at the database level**
   - `REVOKE EXECUTE ON FUNCTION public.get_public_inviters() FROM anon, PUBLIC;` so no anonymous client can call it anymore.
   - Leave `EXECUTE` for `authenticated` so admin/committee tools that still use it (if any) keep working. Verify with a query first: if nothing authenticated relies on it, revoke from `authenticated` too.

3. **Handle the always-true warning**
   - Verified in the DB: the only `USING(true)` policies are SELECT policies on `restaurants`, `menu_items`, `events`, `invitation_content`, `categories` — all intentional public-read content. The linter's own docs exclude SELECT `USING(true)`. No INSERT/UPDATE/DELETE policy uses `true`.
   - Mark `SUPA_rls_policy_always_true` as ignored with that justification and refresh the security memory so it stops resurfacing.

4. **Verify end-to-end before calling done**
   - Playwright on `/rsvp` and `/rsvp/$token`: confirm the dropdown is gone, the text field renders, a submitted RSVP still writes the typed inviter name into the DB, and the network tab shows no anonymous call to `get_public_inviters`.
   - Confirm `/admin/inviters`, `/admin/subcommittee`, and the committee workspace still list inviters correctly (they use RLS-authenticated reads, not the public function).
   - Call `manage_security_finding` with `mark_as_fixed` for `inviters_public_pii` and `ignore` for `SUPA_rls_policy_always_true`, then update the security memory.

## Not in scope

- No change to the `inviters` table schema, RLS policies, or admin/committee UI.
- No change to how inviter quotas, guest linking, or committee messaging work.
- No other security findings touched.

## Technical details

- Field name stays `invitedBy` (string) in the RSVP draft/submit payload so `submitPublicRsvp` and `getPublicRsvpByPhone` need no changes.
- Draft persistence via `useDraftState` continues to work — the field is still a string, only the input control changes.
- Migration used only for the `REVOKE` on `get_public_inviters`; data operations aren't needed.
