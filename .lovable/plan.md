# Permanent meal accounting correction and proof system

2026-08-12 23:36 UTC

## What went wrong

This was not one arithmetic error. The system allowed different screens and labels to describe different units as though they were the same number:

- **Plates** are quantities restaurants prepare.
- **Households** are people/families with a preorder.
- **Order lines** are household + cuisine combinations, which are the individual texts.
- **Paid/unpaid plates** are subsets of total plates, not alternative totals.
- **Texted households** and **texted order lines** are different measures because one household may receive several cuisine-specific texts.

The implementation then compounded that ambiguity:

- Admin meal totals are still calculated independently in one audit path instead of always using the canonical ledger.
- One success message still hard-codes “108 order lines,” even though the live database has changed.
- The old text ledgers used upsert for “sent” and hard delete for “undo,” so the live tables alone could not explain historical actions.
- Historical marks were attributed from retained database evidence, but that evidence does not prove every mark was an explicit text Kari personally sent.
- Committee members with no linked preorder were previously omitted instead of being shown as “No meal order stored.”

These were design and implementation failures. The app presented plausible-looking numbers without enforcing one definition, one source, and one proof trail. That is why you repeatedly had to identify contradictions manually.

## Verified live state

The database and the exact admin mobile route were checked before this plan:

- **134 plates · 69 households · 106 active order lines** now exist in the live database.
- Cuisine totals are **36 African · 55 Indonesian · 43 Myanmar = 134 plates**.
- Payment status is **13 paid plates · 121 unpaid plates = 134 plates**.
- The committee audit shows **25 members: 11 with active orders, 14 with no stored order; 20 lines and 23 plates**.
- Kari is currently attributed **55 active households / 83 active payment-update lines**, plus two retained marks for orders later changed or cancelled.
- Kari’s stated **54 sent** is not reconciled. The database attribution cannot be treated as proof that she personally sent 55. Recipient-by-recipient review is required; the system must show the discrepancy rather than overwrite her count.
- The screen now displays the live 134/69/106 values, but a stale hard-coded “108” remains in source and another admin path still performs independent meal arithmetic.

## Correction plan

### 1. Enforce one accounting contract

Use the canonical meal ledger as the only source for every admin, committee, restaurant, notification, and export total.

```text
Total plates = African + Indonesian + Myanmar
Total plates = paid plates + unpaid plates
Active order lines = every active preorder + normalized cuisine
Text state groups = active order lines exactly once
```

Every view will use the same explicit labels: plates, households, order lines, paid plates, unpaid plates, texted households, and texted order lines. No screen may use “meals” or “sent” without naming the unit.

### 2. Remove remaining parallel and hard-coded totals

- Replace the Admin Overview audit calculation with canonical ledger totals while retaining a separate, plainly labeled unlinked-record exception list.
- Replace the hard-coded “108 order lines” message with the current database value.
- Pass canonical paid/total quantities into committee payment displays instead of recalculating them locally.
- Audit every CSV/export and route consumer so all totals and row membership come from the same ledger snapshot and carry the same UTC read timestamp.

### 3. Make text history evidentiary, not assumptive

- Keep the new append-only text-event history; never delete or overwrite sent/reversed evidence.
- Stop presenting imported legacy marks as proven human sends. Label each event by evidence source: explicit current action, legacy live mark, recovered reversal, or unresolved historical evidence.
- Display active current state separately from retained history for cancelled/changed orders.
- Require every new sent/reversed event to contain actor, campaign, preorder, cuisine, timestamp, and source, followed by immediate database read-back.
- Keep original meal texts and payment-update texts as separate campaigns everywhere.

### 4. Reconcile Kari’s 54 recipient by recipient

Create an authorized reconciliation view containing the 55 active households currently attributed to Kari, the two changed/cancelled historical marks, cuisine lines, timestamps, and evidence source.

- Kari can confirm or dispute each attribution without deleting the evidence.
- Confirmed explicit actions count toward “Kari confirmed sent.”
- Unconfirmed legacy marks remain visible as “historical mark — not personally confirmed.”
- The screen will show the honest equation, for example: confirmed + unconfirmed + reversed/changed = retained attributed evidence.
- Do not force the result to 54. Resolve the one-household discrepancy from actual recipient evidence and preserve the outcome in append-only events.

### 5. Preserve every order and committee member

- Continue showing all 25 committee members, including “No meal order stored” and linkage exceptions.
- Never infer or invent an order for a member without one.
- Never delete or hide cancelled, changed, unlinked, or historical submissions; show them in authorized exception/history views while excluding them from active totals by an explicit rule.

### 6. Add automatic reconciliation gates

- Add tests using live-shaped fixtures for plate, household, order-line, payment, campaign-state, committee, and actor-attribution equations.
- If any invariant fails, replace confident totals with a visible accounting warning and the exception rows.
- Add a database-backed snapshot identifier/read timestamp so two screens can prove they are showing the same accounting state.
- Treat every future mutation as incomplete until the exact database row is read back and every affected total reconciles.

## End-to-end verification required before any completion claim

- Database read-back proves the then-current cuisine sum, payment sum, household count, and order-line count.
- Admin at **384×681**: Overview, Meal texts, committee audit, payment views, and CSV exports show identical definitions and totals.
- Committee at **384×681**: own meal-text list and payment list match the same canonical rows and do not expose other committee members’ private lists.
- Restaurant role: cuisine-scoped active lines and quantities match the canonical ledger.
- Controlled explicit send and reversal: verify the exact append-only events, current status, actor attribution, screen movement, and restored totals.
- Kari reconciliation: every one of the 55 currently attributed active households is accounted for as confirmed or unconfirmed, the two changed/cancelled marks remain retained, and the stated 54 discrepancy is resolved from evidence rather than arithmetic assumptions.
- No submitted preorder, RSVP, payment, text mark, committee member, or audit record is deleted, hidden, or overwritten.

## Technical details

- Keep TanStack authenticated server functions and the current role model.
- Keep server-function modules thin; calculations and reconciliation helpers remain imported server modules.
- Use schema migration only if an additional immutable reconciliation field/view is required; use approved data operations only for evidence-backed reconciliation events.
- Preserve legacy ledgers during transition until every reader is verified against the append-only event model.
