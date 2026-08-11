# Make every restaurant QR open the official Zelle banking flow

## Goal
A guest tapping any restaurant QR code or **Pay with Zelle** button should be handed to the exact official Zelle URL encoded by that restaurant’s QR—not an invented app link or an enlargement-only dialog.

## Changes
1. **Use the official QR destination directly**
   - Remove the conversion to the unsupported `zellepay://` scheme.
   - Open each restaurant’s stored `https://enroll.zellepay.com/qr-codes?data=...` destination from both the QR image and the payment button.
   - Preserve the exact recipient encoded by each restaurant: Burmese/Kawnnan, Indonesian/Inez Retnosari, and African/Senait.

2. **Make the mobile action unambiguous**
   - Primary action: **Continue to Zelle**.
   - Keep **Enlarge QR** only for guests scanning from a second device.
   - Do not claim the website can force-open or prefill an arbitrary bank app; Zelle controls the bank-selection/handoff after the official URL opens.

3. **Provide a clear fallback without dead ends**
   - If the official Zelle page cannot open, show the recipient name and phone, copy the number, and offer **Find/Open my bank** through Zelle’s official flow.
   - Keep the QR visible for scanning from another device.
   - Replace misleading diagnostics such as “app missing” when the browser cannot actually determine that reliably.

## Verification
- Test the exact guest-facing RSVP/preorder route at the current 384×681 phone viewport.
- Tap the QR and primary button for all three restaurants and verify each navigation request contains the restaurant’s exact official Zelle payload.
- Verify the fallback identifies the correct restaurant and copies the matching phone number.
- Verify **Enlarge QR** still works independently for second-device scanning and no existing meal, RSVP, or payment records are changed.

## Important limitation
A website cannot bypass Zelle or a guest’s bank security, log into their bank, or guarantee a prefilled transfer inside every bank app. The reliable handoff is the restaurant-issued official Zelle QR URL; Zelle then connects the guest to a participating bank, while the recipient copy/QR remains available if that bank does not accept a direct prefill.
