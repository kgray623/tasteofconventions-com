# Correct the Zelle QR payment flow

**Plan timestamp:** 2026-08-11 03:52 UTC

The three saved QR codes are valid recipient QR codes, but their web URLs currently open Zelle’s “Find Your Bank” page rather than universally opening a guest’s banking app with the restaurant filled in. The app and text must not describe those URLs as direct one-tap payment links.

## Changes

- Remove the misleading “To pay with Zelle, tap here” link from both catered-meal text templates and all generated messages.
- Restore the selected **QR plus phone** flow for each cuisine:
  - Tell the guest to open Zelle inside their own bank app.
  - Show the exact restaurant recipient name and phone number in the text.
  - Include the matching meal-page link as the place to display that restaurant’s real QR code and food photos.
- Remove or relabel the guest-facing “Pay with Zelle” button so it cannot send guests to Zelle’s bank-search page or imply direct payment.
- Keep all three existing QR images visible on their matching meal/RSVP cards, tappable for a larger view, with a concise instruction to scan the QR from another device or use the saved phone number in the banking app.
- Preserve all payment records, meal orders, sent marks, and other submitted information unchanged.

## Restaurant mapping to preserve

- African / Lalibela: Senait T Gebremichael — 402-939-9093
- Indonesian / Koen: Inez Retnosari — 402-853-2509
- Myanmar / Burmese: Asian Burmese Restaurant / Kawnnan — 310-595-6907

## Technical details

- Update the shared meal-text default and renderer so both Admin and Committee text screens produce the same honest QR/phone instructions.
- Update both saved `app_settings` meal templates and read them back from the database.
- Update the shared restaurant payment card used by meal pages and RSVP meal cards; do not alter meal accounting or payment confirmation logic.

## Verification

- Read back both live templates and all three restaurant QR/name/phone mappings from the database.
- Render one complete text per cuisine and confirm it contains the correct recipient, phone number, and cuisine-specific QR page—without a direct-payment claim.
- Test the Admin and Committee generated-message flows under their actual signed-in roles.
- At a 384 × 681 mobile viewport, verify all three meal routes and a guest RSVP meal card show the correct QR and instructions without overlap.
- Confirm the previous Zelle URL is no longer exposed as a “Pay with Zelle” action.