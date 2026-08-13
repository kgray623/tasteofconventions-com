# Put the text list first and make it unmistakable

**Verified database read: 2026-08-13 02:57 UTC**

The current event has **69 active meal contacts** after excluding cancelled meals, declined RSVPs, and Zoom attendees. Comparing those active orders with recorded payments and the retained payment-update text evidence currently identifies:

- **Abby — 531-484-7114 — African ×1**

Abby's prior send mark was explicitly disputed, so she must remain on the needs-text list.

The database still has more payment-update send marks than Kari's reported **54 physical texts**. Those marks do not provide enough truthful evidence to name the remaining unknown recipients automatically; no person will be falsely labeled texted or untexted.

## Changes

1. Put a **“Text these people now”** section at the very top of `/admin/meal-texts`, before totals, templates, and accounting details.
2. Show every currently identifiable recipient in a simple actionable row with **name, phone, all cuisines/quantities, Text button, and Copy number button**.
3. Keep the section event-wide and current: active meal preorders only, with cancellations, declined RSVPs, Zoom attendees, and paid cuisines excluded.
4. Keep disputed send evidence on the list; only an explicit physical-send confirmation or payment record removes a cuisine from it.
5. Add a prominent warning beside the list that the recorded marks exceed the reported 54 physical texts, with a direct link to the existing reconciliation review so the remaining unknown recipients can be identified without overwriting history.
6. Make the existing CSV control export exactly the visible needs-text list by default.

## Verification

- Sign in as admin and verify `/admin/meal-texts` at **384×681**.
- Confirm Abby appears immediately with the correct phone and African ×1 order.
- Confirm paid, cancelled, declined, and Zoom contacts do not appear.
- Use the Text action and verify it opens the device SMS composer with Abby's number and the prepay message.
- Confirm the exported CSV contains the same visible recipient list.
- Read the backend again after testing and confirm no guest, RSVP, payment, or historical text record was modified merely by viewing or opening the SMS composer.
