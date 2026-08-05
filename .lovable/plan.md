# Correct Tina Santana’s RSVP records and mobile committee controls

## Confirmed findings

- **Gisel and Said** and **Gisel Morga** are the same household. The database currently splits their information: “Gisel and Said” has the Indonesian meal order for 2 but no RSVP, while “Gisel Morga” has the confirmed in-person RSVP for 2 under a mistyped 11-digit phone number.
- **Jessica Diaz** is currently confirmed by Zoom and credited to **Betsaida Ruiz**. Tina’s duplicate ledger correctly shows Betsaida as the First-Loaded-Wins owner. Per your confirmation, Jessica’s RSVP must change to **declined**, without transferring referral ownership.
- **Jenni Aguilar** now has a confirmed in-person RSVP for 3, submitted August 5, 2026. Her screenshot complaint predates that saved RSVP, so the live Tina dashboard must be checked to ensure she now appears in the correct confirmed/latest sections.
- **Teresa Paiz** is Tina’s guest, remains pending, and has a recorded invitation sent date. The current code includes a resend action, but its visibility and behavior still need exact mobile verification.
- Tina’s screenshot shows the old native RSVP dropdown overflowing and covering adjacent guests. The current component uses the app’s menu component, but it has not yet been verified under Tina’s exact mobile role and viewport.

## 1. Reconcile Gisel’s household without losing submissions

- Make **Gisel and Said** the canonical visible household because it has the valid 10-digit phone and existing meal preorder.
- Move/copy the confirmed in-person RSVP for 2 onto that canonical invitation and preserve its original response timestamp.
- Retain the second submitted record and its history in the authorized audit/archive trail; do not silently delete or discard it.
- Ensure Tina’s dashboard counts the household once, shows it under confirmed in person, and keeps the Indonesian order for 2 attached.
- Add a forward guard to prevent an RSVP from creating a second invitation when a submitted phone differs only by an obvious extra digit and an existing household can be resolved safely. Ambiguous matches must be logged for admin review rather than auto-merged.

## 2. Correct Jessica while preserving First-Loaded-Wins

- Change Jessica Diaz’s RSVP from confirmed by Zoom to **declined**.
- Keep the invitation credited to **Betsaida Ruiz**.
- Keep Jessica visible to Tina under **Duplicates — credited to someone else**, now labeled Declined and naming Betsaida as the owner.
- Read back the stored RSVP and both committee views to prove the status changed without changing ownership.

## 3. Make Tina’s mobile guest controls reliable

- Constrain each guest row and action area so name, phone, RSVP menu, resend button, sent-status control, edit, and delete never overlap at **384 × 681**.
- Make the RSVP menu open in a readable overlay with all decline, in-person, Zoom, and clear choices fully visible and tappable.
- Keep **Send reminder / Resend text** visible for Teresa and every previously texted guest; opening Messages must not automatically claim that a text was sent.
- Keep sent tracking as a separate explicit confirmation so tapping a resend link cannot falsely update the database.

## 4. End-to-end verification as Tina

- Sign in through Tina Santana’s real committee role and test the exact committee dashboard route at **384 × 681**.
- Verify Gisel and Said appears once in the correct status/count with the meal order retained.
- Verify Jessica appears as a declined duplicate credited to Betsaida and does not affect Tina’s confirmed totals.
- Verify Jenni Aguilar appears as confirmed in person for 3 and in the latest-response ordering.
- Open Teresa Paiz’s resend action and inspect the one-recipient `sms:` destination and RSVP link; confirm no sent timestamp changes until the explicit sent control is used.
- Open and use the RSVP menu on multiple adjacent guest rows, then read every changed value back from the database.
- Report authenticated and mobile verification separately; do not call any untested path complete.

## Technical details

- Data corrections use approved backend data updates, not schema migrations.
- Any forward-resolution change will be narrowly scoped to the existing invitation/RSVP submission path and will preserve the current First-Loaded-Wins referral rules.
- Existing guests, meal preorders, RSVP history, duplicate records, and audit records remain retained.

Update — 2026-08-05 05:06 UTC