# Verify the Zelle buttons, starting with Inez (Indonesian)

**Plan timestamp:** 2026-08-11 06:00 UTC

## Plain-language answer first

When a guest taps a Zelle button, the app hands their phone an official Zelle link that carries the restaurant's recipient info (name + phone). What happens next is decided by Zelle and by the guest's bank app, not by this website:

- On a phone with a bank/Zelle app that claims that link, the app opens with the recipient already filled in — this is what you saw work twice.
- On a phone or browser that doesn't claim it, Zelle shows its own "Find your bank" page first.

No website can force the second case to skip that step. That is the only thing my earlier note meant. Nothing is broken and nothing is being hidden.

## What is confirmed in the database right now

All three active restaurants have a recipient name, phone, QR image, and an official `enroll.zellepay.com` link:

- Lalibela (African) — Senait T Gebremichael — 402-939-9093
- Koen (Indonesian) — Inez Retnosari — 402-853-2509
- Burmese (Myanmar) — Asian Burmese Restaurant / Kawnnan — 310-595-6907

One difference found: Lalibela and Burmese links encode the payment payload in the same compact form, while Koen's link encodes a differently formatted payload (pretty-printed, lowercase action, name "INEZ"). Both are decodable, but the Indonesian one is not byte-identical in style to the two you already tested successfully. That is the single most likely reason Inez's could behave differently on a real phone.

## Work

1. Re-read the Indonesian QR image you uploaded and decode it directly, then compare it to the stored Indonesian link, so the link matches the QR exactly rather than a re-typed version.
2. Normalize the Indonesian payment payload to the same encoding shape as the two links that already worked (same field order, same casing, no extra whitespace), keeping Inez Retnosari and 402-853-2509 unchanged.
3. Re-verify all three links end to end after the change so the two that already worked are not disturbed.
4. Confirm that every guest-facing surface — public/token RSVP, signed-in RSVP, preorder, and each cuisine meal page — sends the correct restaurant's link, with no cross-restaurant mixups.
5. Keep the same-screen fallback on each card: recipient name, copyable phone number, price, memo instruction, and the enlargeable QR for scanning from another device.

## Verification before I report back

- Decode and print each of the three final links and confirm recipient name and phone match the restaurant record.
- Fetch each link and confirm it resolves to Zelle's own domain (not an error page).
- At the real 384x681 mobile viewport, open all three cuisine pages plus a guest RSVP meal card and confirm the exact outgoing URL per restaurant.
- Report exactly what I verified in the browser versus what only your physical phone with your bank app can confirm — I will not call the bank-app handoff "verified" from a sandbox.

## What only you can confirm

The final in-app step on your phone with Inez's link. After I normalize it, tap it once on your phone: if it opens your bank's Zelle screen with Inez Retnosari / 402-853-2509 prefilled, the Indonesian flow matches the two you already paid.
