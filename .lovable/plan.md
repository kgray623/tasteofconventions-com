# Complete instruction-text list for every meal preorder

**Verified backend read: 2026-08-13 04:03 UTC**

The active event has **69 meal-preorder contacts and 106 cuisine instruction messages**. The retained review evidence currently shows **zero contacts with every required cuisine instruction text physically confirmed**. The existing top list is incorrect for this request because it excludes paid meal lines; payment does not prove that the person received the restaurant/payment instructions.

## Changes

1. Make the first section of `/admin/meal-texts` the complete **“Everyone who still needs meal instructions”** list, based only on active preorders.
2. Include **guests and committee members** who personally preordered; do not include committee members who did not preorder.
3. Include paid and unpaid preorder recipients. Exclude only cancelled meal lines, declined RSVPs, Zoom attendees, and cuisine messages with explicit retained physical-send confirmation.
4. Group each person once, showing their name, phone number, every cuisine and quantity still requiring instructions, and one **Text** action per cuisine with the exact restaurant-specific message.
5. Do not let legacy marks, opening Messages, copying a number, or viewing the page remove anyone. Only an explicit human confirmation that the physical text was sent may remove that cuisine message.
6. Make both CSV controls export exactly the complete visible needs-instructions list, without changing or deleting any preorder, RSVP, payment, or historical text record.

## Technical details

- Build the queue server-side from the canonical active meal ledger plus append-only evidence reviews, so the browser cannot apply a conflicting paid/unpaid filter.
- Return an explicit contact-level queue from `getMealTextData`; keep `meal-texts.tsx` focused on rendering that result.
- Treat each preorder + cuisine as independently confirmed because different cuisines require different restaurant instructions.
- Preserve the canonical meal ledger, reconciliation checks, payment-recording UI, restaurant portal, guest records, and all historical evidence.
- Add regression coverage proving that a paid preorder remains in the instruction queue until its physical-send evidence is confirmed.

## Verification

- Read the backend before and after implementation and reconcile active contacts, cuisine messages, excluded RSVP/cancellation lines, and confirmed physical sends.
- Sign in as admin and verify `/admin/meal-texts` at **384×681**.
- Confirm all **69 currently unconfirmed preorder contacts** are visible unless evidence changes during implementation, and confirm the displayed cuisine-message count matches the backend read.
- Specifically verify paid and committee preorder recipients appear, while non-ordering committee members, cancelled meals, declines, and Zoom attendees do not.
- Open representative African, Indonesian, and Myanmar Text actions and verify the phone number and exact cuisine-specific instructions in the SMS composer without writing a sent mark.
- Confirm the CSV matches the visible list exactly.
- Read the backend again and prove that viewing, copying, exporting, or opening Messages changed no preorder, RSVP, payment, or text-history row.
