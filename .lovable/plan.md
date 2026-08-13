# Replace the meal-text controls with clear sent and not-sent lists

## Verified current state — August 13, 2026 at 05:27 UTC

- The current `/admin/meal-texts` screen repeats each order inside several controls: cuisine badges, Text, Copy number, Mark sent, status filters, and a second cuisine section. This makes the actual sent status hard to identify.
- The retained August 12 Chicago-time records currently identify **69 unique active preorder contacts: 55 marked sent and 14 not sent**.
- Category-level order lines currently reconcile as:
  - **African:** 23 sent / 7 not sent
  - **Indonesian:** 31 sent / 9 not sent
  - **Myanmar:** 29 sent / 7 not sent
- People ordering multiple cuisines appear in each applicable category, so category totals are order lines rather than unique-person totals.
- **Stephanie Williams — (402) 686-9238 — Myanmar ×1 — NOT SENT.** There is no August 12 sent event for her preorder.

## Screen replacement

1. Replace the existing top queue, status-filter boxes, per-person badges, Copy buttons, Mark sent buttons, check icons, and duplicated lower meal-order controls with one clear status roster.
2. Organize the roster by cuisine: **African**, **Indonesian**, and **Myanmar**.
3. Inside every cuisine, show exactly two dated sections:
   - **SENT — August 12, 2026**
   - **NOT SENT**
4. Each row will show only the information needed to identify the person:
   - name
   - exact phone number
   - meal quantity
   - an unmistakable full-width status label
5. Use the August 12 platform marks—recorded after Kari physically sent the screenshot-listed messages—as the sent evidence. Reconcile those records against the screenshot-derived phone list before rendering; unmatched or ambiguous numbers remain **NOT SENT**, never silently treated as sent.
6. Keep the page read-only for this audit view. It will not add, remove, or change any sent mark merely by viewing, tapping, or reloading.
7. Keep one download control that exports the identical category/status roster, including each status and the August 12 sent date.

## Technical details

- Return both sides of the same calculation from the server: all active preorder cuisine lines joined to the explicit August 12 Chicago-time payment-instruction sent records.
- Do not infer sent status from payment, role, inviter, RSVP ownership, an old meal-message timestamp, opening Messages, or chronological ordering.
- Keep all historical events and active preorder data intact; this is a presentation and read-model correction, not a destructive rewrite.
- Preserve contact-level truth while displaying it by cuisine: a person with several cuisines appears in each relevant cuisine with the same verified sent/not-sent status.

## End-to-end verification

- Sign in with Kari’s admin role and test `/admin/meal-texts` at **384×681**.
- Confirm the first screen makes **SENT August 12** versus **NOT SENT** obvious without opening filters or interpreting controls.
- Confirm Stephanie Williams appears under **Myanmar → NOT SENT**, with `(402) 686-9238` and quantity 1.
- Compare every displayed phone/status against the August 12 database evidence and the screenshot-reconciled list.
- Confirm category counts are African 23/7, Indonesian 31/9, and Myanmar 29/7, while unique contacts remain 55 sent / 14 not sent.
- Download the CSV and verify it matches the screen exactly.
- Read the database again after testing and confirm no preorder, RSVP, payment, sent mark, cancellation, or historical event changed.
