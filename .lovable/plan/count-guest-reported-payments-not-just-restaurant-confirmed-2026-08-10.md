# Count guest-reported payments, not just restaurant-confirmed ones

## What the database says (read 2026-08-10 00:47 UTC)

- Melissa Novotny (402-679-6544, Indonesian, 1 meal) has **no payment row and no restaurant confirmation** — so today she sits in the 113 "still need the payment text" queue even though she paid by Zelle.
- Only 4 of 117 order units are marked paid, and every one of those came from a restaurant portal action.
- There is no way for a guest, a committee member, or an admin to record a payment. The only place a payment can be entered is the restaurant portal, so any Zelle/Venmo payment the restaurant hasn't matched (for example a transfer with no name in the memo) is invisible to the accounting.

That is the gap: the ledger measures "restaurant confirmed" and calls it "paid."

## What changes

Add two more ways a payment gets into the same ledger, with the source recorded on every row:

1. **Guest says "I already paid"** — on the guest's own RSVP/meal card, a button to report payment: which cuisine, chicken or beef, how they paid (Zelle / Venmo / phone / cash), the date, and an optional note (for example "no name in the memo"). Writes a payment record marked *reported by guest, unverified*.
2. **Committee or admin records a payment on a guest's behalf** — same fields, from the meal-texts screens and the guest row, marked *recorded by committee*, with who recorded it.
3. **Restaurant confirmation stays exactly as it is** and is the highest level of proof.

Nothing is overwritten: a guest report never erases a restaurant confirmation, and a restaurant confirmation upgrades an existing guest report rather than replacing it.

## What the accounting shows after this

Each order unit lands in exactly one state, and the totals must still sum to 117:

1. **Paid — restaurant confirmed**
2. **Paid — reported, awaiting restaurant confirmation** (Melissa lands here)
3. **Still needs the payment text**
4. **Payment text sent, not paid**
5. **Accounting exception**

Both paid states are excluded from the texting queue, so nobody who says they paid gets chased for money. States 1 and 2 are shown separately so you always know which payments the restaurant has actually matched.

Guests in state 2 appear on a short **Payments to verify** list for admin and for the restaurant portal, showing the guest, cuisine, amount owed, how they said they paid, their note, and the date — so the restaurant can match it and confirm.

## On the guest's own page

Once a payment is recorded (by them, by committee, or by the restaurant), the guest's meal card shows a clear receipt line: "Payment recorded — chicken, Indonesian, reported Aug 9" and, once the restaurant confirms, "Confirmed by the restaurant." This answers Melissa's message directly: she can see where it shows she paid.

## Verification before this is called done

- Record Melissa Novotny's Indonesian chicken payment as guest-reported, then read back from the database that the row exists with its source and note.
- Confirm the totals still reconcile to 117 across the five states, and that the texting queue drops from 113 to 112 with Melissa removed from it.
- On a phone-sized viewport: as the guest, report a payment and see the receipt line; as admin, see it on the verify list; in the restaurant portal, confirm it and see the state move from reported to confirmed with the guest's receipt line updating.
- Confirm no existing payment, confirmation, or send history is deleted or altered.

## Technical details

- Migration: add `source` (`restaurant` | `guest_reported` | `committee_recorded`), `method`, `reported_by`, `reported_note`, and `verified_at` to `public.meal_payments`, with GRANTs and RLS so a guest may insert/read only their own preorder's rows and admin/team may read all; restaurant confirmation continues to write through the existing server path.
- `src/lib/meal-communication.ts`: split `paid` into `paid_confirmed` and `paid_reported`, both excluded from `needs_update`; keep the reconciliation invariant.
- `src/lib/meal-communication.server.ts`: load the new columns.
- New server functions for guest self-report and committee/admin record, each writing one (preorder + cuisine) row only, with an immediate read-back.
- UI: guest meal card in `src/components/my-rsvp-content.tsx` / `src/routes/rsvp.$token.tsx`, verify list on `src/routes/_authenticated/admin/meal-texts.tsx` and the restaurant portal, badges in `src/components/meal-notify-tracker.tsx`.
- No deletions anywhere.
