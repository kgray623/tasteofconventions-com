# Correct the event payment-text list and share it with the team

**Live backend audit: August 20, 2026 at 02:26 UTC**

## Goal

Turn the event-wide meal-text screen into the accurate working list for collecting catered-meal payments. The list will compare every active preorder cuisine line against the canonical payment ledger instead of treating “text sent” as the end of the work.

## Changes

1. Give authorized **admin and team** users access to the same event-wide payment outreach screen from the Event Admin navigation.
2. Build the screen from the canonical active meal ledger, excluding declined, Zoom, and cancelled meal lines while retaining all submitted records and history.
3. Make **Not paid yet** the primary list. Group it by cuisine and show each person’s name, phone, quantity, inviter, and payment-text status.
4. Split unpaid orders into two clear work states:
   - **Needs payment text** — unpaid and no payment update has been marked sent.
   - **Text sent — payment still due** — the payment message was marked sent, but no payment is recorded.
5. Keep paid orders visible in a separate reconciliation section, distinguishing:
   - **Restaurant confirmed**
   - **Reported paid — awaiting restaurant confirmation**
6. Never label a person paid from a text mark. A payment state must come only from the payment/restaurant-confirmation records for the same preorder and cuisine.
7. Keep text tracking cuisine-specific because a person may owe different restaurants. Opening Messages or copying a number will not mark anything sent; only the existing explicit human confirmation will.
8. Make the CSV export match the event-wide payment bookkeeping exactly, including payment state and text state, without deleting, hiding, or overwriting any preorder, payment, RSVP, or text-history record.

## Technical details

- Reuse the existing canonical meal communication ledger, where payment overrides text state and paid people are not chased.
- Replace the current August 12 read-only roster logic on `/admin/meal-texts` with the live ledger states: `needs_update`, `update_sent`, `paid_reported`, `paid_confirmed`, and visible exceptions.
- Expand the admin route authorization/navigation so team-role users can open the event-wide screen; preserve the existing personal “My meal texts” screen.
- Keep privileged reads behind the existing authenticated meal-staff server check.
- Add regression tests proving:
  - unpaid + not texted appears in “Needs payment text”;
  - unpaid + texted remains visible as “Payment still due”;
  - paid reported/confirmed never appears in either unpaid queue;
  - one cuisine payment does not hide another unpaid cuisine for the same person.

## Verification

- Re-read the backend after implementation and reconcile active cuisine lines and plate quantities across all four payment/text states.
- Verify `/admin/meal-texts` at **384×681** as both Kari/admin and a team-role user.
- Open representative African, Indonesian, and Myanmar SMS actions and confirm the correct phone number and restaurant payment instructions.
- Mark one controlled payment text sent and prove the person moves only from “Needs payment text” to “Text sent — payment still due,” not to paid.
- Record/read back one controlled payment and prove only that preorder+cuisine moves to the appropriate paid section.
- Verify the CSV matches the visible event-wide lists and that no viewing, texting, or export action changes payment or preorder data.
