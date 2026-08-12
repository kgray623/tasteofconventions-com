# Correct meal totals, text accounting, and committee visibility

2026-08-12 22:32 UTC

## Verified database baseline

- **137 total plates ordered**: African 36 + Indonesian 57 + Myanmar 44.
- Those orders belong to **70 households** and form **108 order lines** (one household + one cuisine).
- **124 is not the total**. It is the unpaid subset: 137 total plates − 13 paid plates = 124 unpaid plates.
- The current payment-update ledger contains **105 marks**, covering **101 active order lines**. The screen is currently presenting active marked order lines as though that proves the corresponding texts were sent.
- The separate original-message ledger currently contains **22 marks**. Its audit history records 99 inserts and 77 deletes, so previous sent history has been removed from the live ledger and must be reconciled from retained audit evidence rather than guessed or discarded.
- The database contains 25 committee-member invitations. **11 committee members have linked active meal orders** totaling **23 plates across 20 cuisine lines**; **14 currently have no linked preorder record**. Their names must remain visible in an audit view instead of silently disappearing.

## Correction

1. **Use one canonical meal total everywhere**
   - Admin Overview, Cuisine preorder report, Meal texts, committee Meal texts, notification tracker, and CSV exports will all read the same canonical ledger.
   - Every screen will show the same three clearly named measures: **137 plates · 70 households · 108 order lines**.
   - Paid/unpaid numbers will be labeled as subsets, never presented as totals: **13 paid plates · 124 unpaid plates** at the verified baseline.
   - Add invariant checks so African + Indonesian + Myanmar must equal total plates, and paid + unpaid must equal total plates. Show an accounting warning rather than a confident number if either equation fails.

2. **Make text accounting match human actions**
   - Keep the two ledgers visibly separate: **Original meal text** and **Payment update text**.
   - For each ledger, show both **people/households** and **order lines**, because one person may require multiple cuisine-specific texts.
   - Show counts by actor (Kari, each committee member, or historical/system import), with timestamps. A combined number will never be labeled as “you sent.”
   - Reconcile the user-reported **54 sent** against the retained audit history and the exact set of recipients. Restore legitimate history into the appropriate ledger only when the audit evidence identifies the matching guest+cuisine rows; unresolved records remain visible as exceptions.
   - Remove any mass-created or incorrectly attributed marks only after the audit proves they are not explicit human actions. Preserve every row and audit record during reconciliation.

3. **Make committee meal orders auditable**
   - Add a Committee orders view showing every committee member in one of three states: **active order**, **no meal order stored**, or **linkage exception**.
   - For active orders, show cuisines, quantities, and the linked preorder. At the verified baseline this section must total **11 committee orderers · 20 order lines · 23 plates**.
   - The 14 committee members with no stored preorder remain listed by name as “No meal order stored”; they are not silently omitted and no meal is invented for them.
   - Add an authorized edit path so an admin or the committee member can record/correct a missing order, followed by database write and read-back. Existing meal, RSVP, payment, and sent-history data must not be overwritten.

4. **Fix the mobile presentation**
   - On the exact 384×681 mobile layout, replace the ambiguous badge pile with short labeled rows for Total orders, Payment status, Original texts, and Payment updates.
   - Cuisine sections retain all active orders, including paid guests and committee members, with status filters changing only visibility—not totals or stored data.

5. **Resolve the authorization failure on cold mobile loads**
   - Trace the protected meal-count calls that currently surface “No authorization header provided.”
   - Ensure they wait for the authenticated session and fail with a visible retry state rather than producing stale or partial accounting.

## Verification before any completion claim

- Read the database and prove: **36 + 57 + 44 = 137 plates**, **13 + 124 = 137 plates**, and the canonical ledger has **70 households / 108 order lines**.
- Reconcile all live and historical text marks: current rows + restored rows + unresolved audit exceptions must account for every insert/delete event; report exactly how the user’s 54 maps to people and cuisine lines.
- Verify every named committee member against invitation → preorder → cuisine selections; prove the active committee subtotal and display all no-order members.
- As admin at **384×681** on Admin Overview, Cuisine preorder report, and Meal texts, confirm identical totals and labels.
- As a committee user at **384×681**, confirm their own orders and guests, edit one controlled test order, read it back from the database, then restore the original value without losing history.
- Mark one controlled payment update as sent, verify the exact ledger row and actor, undo it, and verify all totals return to baseline.

## Technical details

- Consolidate totals and classifications in the existing canonical meal communication ledger; remove route-local arithmetic from the meal-text screen and direct client-side preorder report.
- Add a server-backed committee reconciliation result keyed by invitation and preorder, with explicit exception rows.
- Keep server-function files as thin authenticated wrappers and move reusable calculations to imported modules.
- If restoring sent marks requires a migration, use an append-only reconciliation migration derived from audit evidence; no destructive cleanup and no silent backfill.
