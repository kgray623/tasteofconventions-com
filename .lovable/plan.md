# Friendly "meal preordering has closed" message

Plan written 2026-08-30 17:25 UTC. Investigation done first, as asked — findings below.

## Where the error comes from

The block is a database guard, not app code:

- `guard_preorders_closed()` (trigger on `cuisine_preorders`) raises
  `PREORDERS_CLOSED: new cuisine preorders are closed, add to meal_waiting_list instead`
  unless a server-side authorization flag is set. Verified live in the database.
- Every guest meal write goes through `save_meal_order(...)` in
  `src/lib/invitations.functions.ts`, at three call sites:
  - `submitCuisinePreorder` (line ~427) — used by the personal invitation page
    `/rsvp/$token` and the logged-in dashboard (`my-rsvp-content.tsx`)
  - `submitStandaloneCuisinePreorder` (line ~509) — `/preorder`
  - `submitPublicRsvp` (line ~976) — the public `/rsvp` form, when the guest
    picked cuisines along with their RSVP
- Errors from the first two go through `mealWriteError()` → `publicDbError()`,
  which currently returns the generic **"Something went wrong. Please try again."**
  The guest UIs surface that with `toast.error(e.message)`
  (`rsvp.$token.tsx:334`, `my-rsvp-content.tsx:234`).
- Worse case: in `submitPublicRsvp` the closed-preorder error is **thrown after the
  RSVP row was already saved**, so the guest sees a failure toast and assumes their
  RSVP did not go through, even though it did.

So there is nothing wrong with the RSVP yes/no write itself — it is the meal step's
error handling that needs to change.

## The fix

1. In `src/lib/invitations.functions.ts`, add a single recognizer for the
   `PREORDERS_CLOSED` message and return a friendly, non-technical message:
   "Meal preordering has closed. You're welcome to pay for a meal at the event, or bring a covered dish."
   Applied in `mealWriteError()`, so `/rsvp/$token`, `/my-rsvp` and `/preorder` all
   show that sentence instead of the generic error text.
2. In `submitPublicRsvp`, treat the closed state as expected: keep the RSVP save
   (already written), skip the meal write, and return `mealPreorderClosed: true`
   instead of throwing. No RSVP behavior changes.
3. In the RSVP submit handlers (`src/routes/rsvp.index.tsx`, `src/routes/rsvp.$token.tsx`),
   when `mealPreorderClosed` comes back, still show the RSVP success toast, plus a
   separate neutral info notice with the same closed-preordering sentence — not an
   error toast.
4. In the meal-only save handlers (`rsvp.$token.tsx`, `my-rsvp-content.tsx`), show the
   closed message as an informational toast rather than an error toast.

Nothing else changes: no schema change, no guard removal, no change to RSVP
yes/no/Zoom submission, party size, payments, texting, or the prepay wait list.

## Verification before I report back

Live-event safe: read-only checks plus a Playwright run at 390px on
`/rsvp` and a real `/rsvp/<token>` link, submitting a meal selection to confirm the
friendly sentence appears and the RSVP itself still saves (verified by database
read-back), with the row count in `cuisine_preorders` unchanged.
