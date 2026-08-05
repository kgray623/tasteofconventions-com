# Make committee texting reliable and audit Tina Santana’s dashboard

## Confirmed scope

- Remove **all group-text controls** from both the admin-wide and committee-member meal-text pages.
- Keep only one-recipient-at-a-time texting. Nothing will send automatically.
- Preserve every guest, RSVP, meal preorder, referral owner, duplicate record, and existing “texted” status.
- Diagnose Tina Santana’s dashboard from her actual linked records and screenshots before changing any ownership or RSVP data.

## 1. Remove group texting everywhere

- Delete “Text group” and “Copy group message” controls from:
  - Admin → Meal texts
  - Committee → My meal texts
- Remove now-unused batching, chunking, and group-message code.
- Keep restaurant grouping only as an organizational heading; every guest beneath it gets an individual **Text [first name]** action.

## 2. Standardize individual text behavior

- Use one shared individual SMS handoff for both pages so admin and committee members do not get different results.
- Build each link with exactly one normalized phone number and that guest’s personalized meal-prepay message.
- Make the native `sms:` link the primary interaction so a real phone opens its Messages app.
- Keep **Copy message** as the visible fallback when the browser or preview cannot launch Messages.
- Do not mark a guest “texted” merely because the Text button was tapped. Retain the explicit **Check here after you text** action and **Texted · Undo** state so the database records only the committee member’s confirmation.
- Show a clear non-destructive warning when a guest has no usable phone number or when restaurant ordering is not ready.

## 3. Audit Mysha’s exact committee flow

- Verify her authenticated identity resolves to the correct inviter record and her owned meal-preorder rows.
- Confirm the page shows all linked individual meal orders without duplicates or unrelated guests.
- On a phone-sized viewport, tap an individual Text action and inspect the generated `sms:` destination and complete personalized body.
- Confirm no group-text control remains anywhere available to her.

## 4. Audit Tina Santana’s platform before changing data

- Reconcile Tina’s authenticated identity, inviter record, owned invitations, RSVP rows, meal preorders, and First-Loaded-Wins duplicate rows.
- Compare every discrepancy shown in Tina’s screenshots against database rows and the exact dashboard calculation that displays it.
- Correct only proven wiring or data errors. Do not transfer referral ownership, merge contacts, or alter an RSVP based on names alone.
- Keep the duplicate section visible with the real original referrer when First-Loaded Wins applies.
- Verify Tina’s dashboard totals, status sections, newest replies, pending invitations, declines, and meal-text list against database read-back.

## 5. End-to-end verification

- Test on the exact committee route at **384 × 681** for both Mysha’s and Tina’s committee roles.
- Test the admin meal-text route separately as an admin.
- Verify route → rendered control → generated SMS URL/body → explicit sent-status update → database read-back.
- Confirm group actions are absent by source search and rendered-page inspection.
- Report any Tina issue that cannot be reproduced from the screenshots or current records instead of claiming it is corrected.

## Current data checkpoint

- Mysha Woods currently has 54 linked invitation households and 6 linked meal-preorder households.
- Tina Santana currently has 37 linked invitation households, 6 First-Loaded-Wins duplicate records, and 9 linked meal-preorder households.
- These are audit checkpoints, not authorization to alter those records.

## Required evidence

Tina’s screenshots/messages are still needed to identify which visible totals, guests, controls, or RSVP states she reported as wrong. Implementation can remove and verify group texting immediately; Tina-specific data corrections will be limited to discrepancies proven by those screenshots and database read-back.

Update — 2026-08-05 04:51 UTC