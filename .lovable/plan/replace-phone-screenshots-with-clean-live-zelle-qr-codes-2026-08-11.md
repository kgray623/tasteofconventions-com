# Replace phone screenshots with clean, live Zelle QR codes

**Plan timestamp:** 2026-08-11 13:04 UTC

## What is confirmed now

- Each restaurant currently displays the uploaded phone image saved in `zelle_qr_url`.
- Each displayed image is already wrapped in that restaurant’s official `zelle_pay_link`, so tapping it uses the correct restaurant payment destination.
- The database currently maps:
  - African / Lalibela → Senait T Gebremichael — 402-939-9093
  - Indonesian / Koen → Inez Retnosari — 402-853-2509
  - Myanmar / Burmese → Asian Burmese Restaurant / Kawnnan — 310-595-6907

## Changes

1. Generate a new, sharp QR-only image for each restaurant from its exact saved Zelle payment URL. The files will contain only the scannable QR with the required white border—no phone screenshot, status bar, surrounding app screen, or photograph.
2. Decode every generated QR before using it and require an exact match to the restaurant’s saved Zelle URL, recipient, and phone number.
3. Store the three clean QR images as project assets and update only each restaurant’s `zelle_qr_url`. Preserve `zelle_pay_link`, recipient details, meal orders, payments, RSVPs, sent marks, and all submitted records unchanged.
4. Keep both payment paths on every existing restaurant payment card:
   - **Same device:** tapping the QR image or payment action opens the restaurant’s saved Zelle destination.
   - **Second device:** enlarging and scanning the clean QR opens the same destination.
5. Update the short instruction so it clearly distinguishes “tap on this device” from “enlarge and scan with another device.”

## Verification

- Read back all three final QR image URLs and payment URLs from the database.
- Decode all three final QR images from their served asset URLs and compare them exactly to the saved restaurant payment URLs.
- At the exact 384 × 681 mobile viewport, verify `/meals/african`, `/meals/indonesian`, and `/meals/myanmar`, plus a guest RSVP meal card.
- On each surface, verify the image is QR-only, enlarges cleanly, and its tap target belongs to the same restaurant—especially Koen / Inez Retnosari.
- Confirm no meal, RSVP, payment, tracking, or guest record changed.

## Important behavior

A QR is scanned by a second device; on the same device, the guest taps the QR image or payment action. Both paths will carry the identical restaurant-specific Zelle destination. Zelle and the guest’s bank control the final app handoff after that destination opens.
