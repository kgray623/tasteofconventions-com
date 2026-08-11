# Tap-to-pay Zelle link in the text (2026-08-11 03:34 UTC)

A text sent from your own phone can't carry an attached image — Messages won't let a prefilled text include a picture. But the QR code itself is just a Zelle web address, and I decoded all three of yours. Putting that address in the text gives you exactly what you want: the guest taps it and lands in Zelle with the restaurant already filled in — no site visit, no scanning.

## What each QR actually points to

- African (Lalibela): `https://enroll.zellepay.com/qr-codes?data=...` → Senait, 402-939-9093
- Indonesian (Koen): `https://enroll.zellepay.com/qr-codes?data=...` → INEZ, 402-853-2509
- Myanmar (Burmese): `https://enroll.zellepay.com/qr-codes?data=...` → Kawnnan, 310-595-6907

These are the exact same payloads a phone camera reads off your QR images, so tapping the link is identical to scanning the code.

## What changes in the text

The primary pay line becomes the Zelle link, and the site page drops to a secondary line:

```text
To pay with Zelle, tap here: https://enroll.zellepay.com/qr-codes?data=...

Or search by phone number 402-939-9093 (Senait T Gebremichael)

QR code and food photos: https://tasteofconventions.com/meals/african
```

Everything else in your saved wording stays byte-for-byte as it is now.

## What changes in the app

- New per-restaurant field for the Zelle pay link, seeded with the three decoded links above.
- New `{zelle_link}` placeholder for the tap-to-pay line; `{zelle_qr_link}` stays available and becomes the secondary "QR code and food photos" line.
- Saved templates (`meal_text_template`, `meal_zelle_text_template`) updated to the arrangement above, then read back from the database to confirm.
- The meal page and the guest's RSVP meal card get a "Pay with Zelle" button on the same link, above the QR image, so a guest on a phone never has to scan their own screen.
- Admin placeholder help lists the new placeholder.

## Technical notes

- Migration: add `zelle_pay_link text` to `public.restaurants`, `UPDATE` the three rows with the decoded URLs, and update the two `app_settings` template rows.
- `src/lib/meal-text-message.ts`: add `zellePayLink` to `MealTextContext` / `PaymentSource`, map `{zelle_link}`, reword `zelleQrLinkLine` to the secondary "QR code and food photos" line, and drop the "You can use either the QR code or" phrasing in favour of "Or search by phone number …".
- `src/lib/meal-text-defaults.ts`: default template mirrors the saved wording.
- Restaurant selects in `meal-texts.functions.ts`, `committee-meal-texts.server.ts`, and `meal-restaurant-contact.tsx` add the new column.
- No change to counts, payments, RSVPs, or any submitted record.

## Verification

- Database read-back of both templates plus the three restaurant links.
- Render one sample text per cuisine and confirm the Zelle link matches that restaurant's QR payload exactly.
- 384px check of `/meals/african` and a guest RSVP meal card showing the Pay with Zelle button.
