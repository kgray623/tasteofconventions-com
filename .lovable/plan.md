# Produce the complete, exact missing payment-update list

2026-08-13 00:10 UTC

## Verified accounting

- There are **62 currently unpaid meal contacts** covering **94 cuisine-specific messages**.
- Kari confirms she physically sent the update to **54 people**, not 54 cuisine messages.
- Therefore the exact missing list must contain **8 people**: `62 unpaid contacts − 54 contacted people = 8 missing people`.
- The database currently has Kari marks on 53 of those unpaid contacts and no mark on 9. There are also marks involving contacts outside the current unpaid set.
- No physical-send evidence reviews have been completed yet. Therefore the marks do not prove which 54 people actually received a text, and calling all 9 unmarked people “missing” is not accurate.

## Correction

1. **Show one complete reconciliation list**
   - Display all 62 unpaid contacts on `/admin/meal-texts`, not only the 9 with no mark.
   - For every person, show name, phone number, all ordered cuisines and quantities, and whether a database mark exists.
   - Keep people grouped as contacts so three cuisine orders do not become three people.

2. **Let Kari identify the 54 people actually contacted**
   - Add a clear **Physically sent** confirmation for each contact.
   - Existing database marks remain visible as reference but do not pre-confirm anyone.
   - Save each decision in the append-only evidence-review ledger with Kari, timestamp, and the underlying cuisine event IDs; never overwrite or delete prior tracking.
   - For a physically sent person whose database mark is absent, append the missing human-confirmed send evidence rather than hiding that person or fabricating a timestamp.

3. **Derive the exact missing list**
   - Show a live reconciliation counter: **54 confirmed sent · 8 missing · 62 unpaid contacts**.
   - Once exactly 54 unique people are confirmed, the remaining 8 become the authoritative **Still needs payment update** list.
   - List those 8 by name, phone, cuisine, and quantity, with the normal one-tap SMS action and CSV download.
   - Do not call the result complete while fewer or more than 54 people have been confirmed; show an explicit reconciliation warning instead.

4. **Keep payment changes safe**
   - If a person pays during reconciliation, remove them from the unpaid target only after the payment record is read back from the database.
   - Recalculate the required sent/missing equation from the current unpaid set and visibly flag that the baseline changed, rather than silently changing the eight-person result.

## Verification before any completion claim

- Database read-back must prove **62 unique unpaid contacts / 94 unpaid cuisine lines** at the starting baseline.
- As Kari on `/admin/meal-texts` at **384×681**, verify all 62 names are visible and no contact is duplicated because they ordered multiple cuisines.
- Confirm a controlled contact, reload the route, and prove the append-only review persists with the correct user, timestamp, and cuisine event IDs; then add a compensating review so no history is lost.
- After Kari identifies the real 54, read the database back and prove there are exactly **54 unique confirmed people** and exactly **8 unique missing people**.
- Compare all 8 displayed names, phones, cuisines, and quantities with the database, then verify the CSV and SMS actions use those same records.

## Technical details

- Reconcile at the `preorder_id` contact level while retaining child cuisine-line evidence.
- Extend the existing evidence-review path to support contacts with no prior event through an append-only human-confirmed event/review pair.
- Keep server-function files as thin authenticated wrappers; place reconciliation calculations in imported server helpers.
- Preserve all current order, payment, sent-mark, event, and audit rows.
