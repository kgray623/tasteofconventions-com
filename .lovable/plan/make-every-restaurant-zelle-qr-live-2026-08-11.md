# Make every restaurant Zelle QR live

## Goal
Make the African, Indonesian, and Burmese restaurant QR codes actionable wherever guests see payment details, while accurately handling Zelle's bank-controlled handoff.

## Changes
1. Update the shared restaurant payment card so tapping each QR opens that restaurant's own official Zelle QR URL instead of only enlarging a screenshot.
2. Keep a separate enlarge/view control for guests who need to scan the QR from another device.
3. Add a clear **Open in Zelle** action beside each QR using the same restaurant-specific official URL.
4. Preserve the restaurant's Zelle phone number and recipient name as the fallback because Zelle may require the guest to choose their participating bank before payment.
5. Apply the shared behavior to every surface already using the payment card, including public/token RSVP pages, signed-in RSVP, preorder, and cuisine meal pages.

## Verified restaurant mapping
- African / Lalibela → Senait T Gebremichael
- Indonesian / Koen → Inez Retnosari
- Myanmar / Burmese → Kawnnan / Asian Burmese Restaurant

Each active restaurant already has its own QR image, Zelle recipient details, and official encoded Zelle URL stored in the database. No submitted order, RSVP, payment, or guest data will be changed.

## Technical detail
A QR image can be made clickable, but a website cannot force a particular bank app to accept a payment. The click will use the restaurant's official `enroll.zellepay.com/qr-codes?...` destination; Zelle and the guest's device/bank determine the final handoff. The interface will not claim a guaranteed one-tap bank transfer.

## Verification
- Test all three restaurant actions on the exact 384×681 mobile viewport.
- Verify each QR and **Open in Zelle** action uses the correct restaurant-specific official URL.
- Verify the public RSVP/token payment card and cuisine meal pages render the correct recipient, phone number, QR image, and fallback instructions.
- Confirm no restaurant QR opens another restaurant's payment destination.