# Never lose a reported meal payment again

2026-08-13 01:29 UTC

## Why Aletta Blair slipped through

Verified in the database and code just now:

- There are three ways a payment gets on record today: the restaurant confirms it, the guest reports it on their own RSVP, or a staff member records it for a guest.
- The staff path exists in the backend (`recordMealPaymentForGuest`) but **no screen anywhere calls it**. No admin or committee page has a "record a payment someone told me about" control.
- So when Melissa phoned in that Aletta paid the restaurant by phone, there was no place to put it. It only got recorded because I wrote it in by hand.
- Current payment records: 6 restaurant-confirmed, 6 guest-reported, 1 committee-recorded (Aletta), 10 still awaiting restaurant verification.

That is the whole cause. Anyone who pays the restaurant directly by phone, cash, or in person is invisible until someone tells you, and then you have nowhere to enter it.

## What this change does

1. **A "Record payment" button on every meal contact.**
   On the current event meal contacts roster (`/admin/meal-texts`) and on the committee meal-payments panel, each contact/cuisine row gets a Record payment action. It asks: how many plates, how they paid (called restaurant / Zelle / Venmo / cash / in person), who reported it, and a short note. It saves through the existing staff path, so it is attributed to you and written to the permanent activity ledger.

2. **Committee members can do it for their own guests, admins for anyone.**
   Same scoping already used on the guest roster. No new permissions.

3. **Recorded payments show honestly.**
   The row immediately reads "Paid — awaiting restaurant confirmation", drops off the needs-prepay-text list, and appears in the existing Payments to verify panel until a restaurant confirms. Nothing is ever deleted; the existing payment lock stays in force.

4. **Restaurants get asked about off-app payments.**
   In each restaurant portal, next to their order list, a short prompt: "Did anyone pay you by phone, cash, or in person?" with the same record action per guest. This closes the source of the problem at the place the money actually arrives.

5. **A standing "reported but not yet on record" safety net.**
   The admin home already has a Payments to verify card. It gains a companion count of paid-but-unverified meals with age, so a report that never got confirmed by the restaurant cannot sit unnoticed.

## Verification before I call it done

- On 384x681, signed in as admin: record a test payment for one contact, confirm it appears as paid, leaves the needs-text list, and shows up in Payments to verify — then read the row back out of the database.
- Repeat signed in as a committee member for one of their own guests, and confirm they cannot record for someone else's guest.
- In a restaurant portal, record one phoned-in payment and confirm it lands as restaurant-sourced.
- Confirm Aletta Blair's existing record is untouched throughout.

## Technical notes

- Wire the existing `recordMealPaymentForGuest` server fn to UI; no new backend logic and no schema change beyond nothing — `meal_payments` already carries `source`, `method`, `reported_by`, `reported_by_label`, `reported_note`, `verified_at`.
- New shared dialog component reused by the meal-texts roster, `committee-meal-payments.tsx`, and the restaurant portal.
- Ledger reads keep flowing through `loadMealCommunicationLedger`, so all screens stay on one arithmetic source.
