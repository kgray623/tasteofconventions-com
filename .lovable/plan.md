# Replace the wrong guest queue with the complete committee texting list

**Verified 2026-08-13 03:11 UTC**

## What is wrong

The top list on `/admin/meal-texts` is currently built from active guest meal preorders. It then hides unpaid rows whenever a payment-update mark has not been explicitly disputed. That is wrong in two ways:

1. **The recipient scope is wrong.** Kari texts every active committee member, and each committee member follows up with their assigned guests. Committee members without a personal meal preorder can never enter the current guest-order list.
2. **The evidence rule is wrong.** An unreviewed legacy mark is currently treated as physical-send confirmation because the code checks “not disputed” instead of requiring an explicit `confirmed` review.

The database currently has:

- **23 active committee members**
- **13 committee members with active meal-order contacts assigned to them**
- **69 active meal contacts assigned across those committee members**
- **4 active committee members without a phone stored**
- **60 unpaid meal contacts / 92 cuisine lines hidden by unreviewed legacy marks**
- **0 meal lines explicitly confirmed by Kari’s review**

Shelley & Pat Monaghan are active, have a phone, and have **9 active meal contacts** assigned to them. Teresa Drake is active, has a phone, and currently has **0 stored meal contacts** assigned to her. Both must still appear because committee members are not excluded based on whether they personally ordered a meal or currently have meal guests.

## Build

1. **Put the complete committee list first**
   - Replace “Text these people now” with an event-wide **“Text every committee member”** list.
   - Include all 23 active committee members, including Shelley & Pat Monaghan and Teresa Drake.
   - Show committee name, phone, number of assigned active meal contacts, number of outstanding guest cuisine messages, and a one-tap SMS action.
   - Keep members with zero assigned meal contacts visible.
   - Keep members with missing phones visible as a clear data exception instead of dropping them.

2. **Make the committee handoff explicit**
   - The message tells each committee member which of their assigned meal contacts still need follow-up.
   - Each committee row expands to show the assigned active meal contacts, cuisines, quantities, payment state, and truthful text-evidence state.
   - Paid, cancelled, declined, and Zoom meal lines remain accounted for but are not presented as unpaid follow-up work.

3. **Track only explicit physical committee texts**
   - Add an append-only committee-text event ledger keyed to the committee member.
   - Opening Messages or copying a number records nothing.
   - Only an explicit “I sent this” confirmation records a send, with actor and timestamp.
   - Reversals append a new event; they never delete or overwrite history.
   - The default queue remains every active committee member without a current human-confirmed committee text.

4. **Correct the guest evidence classification**
   - Require `decision === "confirmed"` before any guest meal line is treated as physically texted.
   - Treat unreviewed legacy marks as **Unverified**, not sent.
   - Keep disputed marks in the needs-follow-up state.
   - Never infer a send from a legacy mark, opening an SMS link, rendering the page, or a bulk operation.

5. **Make exports match the screen**
   - The primary CSV exports the currently visible committee texting list with name, phone, assigned meal-contact count, outstanding cuisine-line count, and explicit send status.
   - A separate detail export includes the assigned guest follow-up rows without exposing hidden email data.

## Technical details

- Preserve the canonical active meal ledger for guest order, payment, cancellation, RSVP, and attendance calculations.
- Build the primary roster from active `inviters`, not `cuisine_preorders`; left-join assigned active meal contacts so zero-order committee members remain visible.
- Add a public-schema committee text event table with authenticated/staff-only grants, RLS, append-only protections, actor identity, event time, and `sent`/`reversed` actions.
- Keep server-function files thin; roster calculation and event read-back live in imported server helpers.
- Do not delete or alter existing meal orders, RSVPs, payments, guest text history, or evidence reviews.

## Verification before reporting completion

1. Read the database back and reconcile the rendered committee roster to **23 active committee members**, including all zero-order members and all missing-phone exceptions.
2. Confirm Shelley & Pat Monaghan display with their stored phone and **9 active meal contacts**; confirm Teresa Drake displays with her stored phone and **0 active meal contacts**.
3. Verify the guest detail math reconciles to **69 active contacts / 106 cuisine lines / 134 plates** at the current baseline.
4. Verify unreviewed legacy guest marks no longer remove contacts from follow-up; only Kari-confirmed evidence may do so.
5. On `/admin/meal-texts` as Kari/admin at the exact **384×681** viewport: open Shelley & Pat’s SMS handoff, confirm no database write occurs, explicitly mark it sent, reload, verify the append-only event and visible status, then reverse it and verify both history entries remain.
6. Verify both CSV exports contain exactly the visible committee and expanded guest rows, with no submitted information lost or silently hidden.
