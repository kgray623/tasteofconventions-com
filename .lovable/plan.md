# Stop meal orders from ever disappearing, and correct the Burmese "Paid" mark

2026-08-11 16:38 UTC

## What the database actually shows

- The three lost African meals (Liza Efigenio, Lori McLaren, Leticia Tchato) were removed by **saves that rewrote each person's whole meal list**, in one 40-second burst on 2026-08-07 between 18:33:42 and 18:34:09 UTC, from a single source address, with **no signed-in user recorded**. Each write replaced the full list with a shorter list; one write replaced it with an empty list.
- These are the **only three** empty-list meal writes in the entire history of the platform. So this is not a random glitch — it was one sequence of destructive full-list saves.
- The exact code path that issued them is **not yet proven** from the audit rows (they record the new value, not the route). Confirming it is step 1 below, not a guess.
- Kari Gray's Myanmar meal is recorded as **paid, source "restaurant", marked by "restaurant:Burmese", on 2026-08-06 20:13 UTC, never verified**. That is why her screen says "Paid — confirmed by Burmese" instead of "Awaiting restaurant confirmation".

## 1. Prove the path that erased the meals (first, before any code change)

- Trace every save path that can write a meal list: the guest RSVP page, the public pre-order page, My RSVP, the committee/admin pre-order editors, and the meal-accounting helpers.
- Match each one against the exact recorded values and timing of the 2026-08-07 burst to identify which one produced them.
- Record the finding in the plan archive so it is not re-litigated.

## 2. Make a meal impossible to lose silently

- **Merge-safe saves.** A save may only change the cuisines it actually submitted. Any cuisine not present in the submission is left exactly as it was. No save can ever blank a list as a side effect.
- **Removal requires an explicit human confirmation.** Lowering a count or removing a cuisine becomes its own confirmed action ("Remove your African meal?"). Without that confirmation the reduction is rejected and nothing changes.
- **Reductions are recorded with the actor.** Every reduction or removal stores who did it, from which screen, and the before/after values. A reduction that arrives with no identifiable actor is refused.
- **Database-level backstop.** A guard on the meal table blocks any write that empties or reduces a list unless the confirmed-removal flag is set for that request, so no future screen, script, or bulk fix can quietly wipe orders again.
- Cancelling on purpose still works: confirm once, and the record is retained with an empty list exactly as today (nothing is deleted).

## 3. Correct the Burmese payment mark

- Review the 2026-08-06 Burmese "paid" event against the project rule that a paid mark may come only from an explicit human action after the act.
- If it was not a genuine restaurant confirmation, clear that mark so Kari's Myanmar row reads **"Awaiting restaurant confirmation"** like her African row, keeping the original event in the permanent history.
- Re-check every other restaurant-sourced paid mark for the same pattern and report each one to you before changing it.
- No payment record is deleted; corrections are additive and visible.

## 4. Verification before I say a word about it being done

- Re-read all three restored African meals plus every other meal list, and confirm counts per cuisine are unchanged by the new guard.
- On the real screens at 384x681: guest pre-order, `/rsvp/<token>`, and `/my-rsvp` — submit a partial save and prove the untouched cuisines survive; then remove a meal with confirmation and prove it is recorded, reversible, and reflected in the restaurant lists and the pre-pay text queue.
- Attempt a destructive write directly against the database guard and confirm it is refused.
- Confirm Kari Gray's card reads Awaiting for both African and Myanmar after the correction, read back from the database.

## Technical notes

- Meal writes: `submitCuisinePreorder` and `submitStandaloneCuisinePreorder` in `src/lib/invitations.functions.ts`, plus the admin pre-order editor; all move to a single merge-safe writer with an explicit `confirmed_removal` input.
- Guard implemented as a `BEFORE UPDATE` trigger on `cuisine_preorders` keyed off a request-scoped setting, mirroring the existing protected-delete pattern.
- Payment correction is a data update on `meal_payments`, retaining the original row in the audit ledger.
