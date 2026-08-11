# Make the Zelle QR actually open Zelle on tap

## What is happening now

Every restaurant card shows a clean QR image wrapped in a link to the official Zelle
destination URL stored for that restaurant (verified in the database for Lalibela,
Burmese, and Koen — all three have a correct `zelle_pay_link` and `zelle_phone`).

That URL is `https://enroll.zellepay.com/qr-codes?data=...` — the exact payload
inside the printed QR code. On a phone, this only jumps into a payment screen if the
installed bank app has claimed that web address as its own. Most bank apps have not,
so the tap opens Zelle's web page in the browser instead of a payment screen. That is
the "tap does nothing useful" behavior being reported. It is not a wrong link or a
wrong image — it is that a single web link cannot reliably hand off into Zelle.

## The fix: a real tap-to-pay handoff, not one link

Replace the single tap target with a handoff that tries the app first and always ends
somewhere useful.

1. **Tap the QR (or the "Pay with Zelle" button) → attempt app handoff.**
   Try the Zelle app scheme first, then the universal link, then fall back. The
   restaurant's phone number and name are copied to the clipboard automatically at the
   moment of the tap, so whatever screen opens, the guest can paste the recipient
   instead of typing or searching.

2. **If no app takes the handoff, show a "Pay by Zelle" sheet** instead of dumping the
   guest on Zelle's website. The sheet contains, in order:
   - The exact amount to send for their order.
   - The recipient phone number with a one-tap Copy button (and name, copyable).
   - "Open your bank app" button — launches Zelle's official destination as a last
     resort for guests who do have a bank that handles it.
   - The clean QR, large, for scanning from a second device.

3. **Keep the QR scannable and unchanged.** The stored QR images stay exactly as they
   are — they already decode to the correct verified payloads.

4. **Same behavior everywhere the restaurant card appears** — guest RSVP page, my-RSVP
   meal payment panel, and the meal payment screens — because they all render the one
   shared restaurant contact component.

## Honest limitation

Zelle does not publish a public deep link that pre-fills a payment inside an arbitrary
bank app. No website can force that. What is achievable, and what this plan delivers,
is: one tap, app opens if the phone allows it, recipient already on the clipboard, exact
amount on screen, zero searching. That removes the ten-step problem even when the
handoff itself is refused by the bank app.

## Verification before I call it done

- Test the tap path on a mobile viewport for all three restaurants (Lalibela, Burmese,
  Koen) and confirm the attempted destination is that restaurant's own verified link.
- Confirm the fallback sheet appears with the correct phone, name, and amount when the
  app handoff does not take.
- Confirm the clipboard copy fires on tap.
- Re-decode each QR image after the change to prove the payloads still match the
  database links.
- Report exactly what I verified in the sandbox versus what only your phone with a real
  bank app can confirm — and I will not claim the in-app pre-fill works on your device
  until you test Inez's Indonesian payment and tell me it did.

## Technical notes

- `src/components/meal-restaurant-contact.tsx` — replace the plain `<a>` wrapper with a
  handoff click handler plus fallback dialog; keep existing copy button and pricing.
- Add a small shared helper for the handoff sequence and clipboard write so both the QR
  tap and the button use identical logic.
- No database changes. `restaurants.zelle_pay_link`, `zelle_phone`, `zelle_name`, and
  `zelle_qr_url` are already correct and stay untouched.
- No changes to payment records, meal counts, or any lock/guard logic added earlier.
