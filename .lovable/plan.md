# Make the Zelle QR codes impossible to miss

All three restaurants already have a QR image saved (Burmese, Koen, Lalibela). Today the QR only appears if a guest happens to scroll the meal page; the payment text only gives the Zelle phone/name.

A text message sent from your own phone can't reliably carry an image (it would drop to MMS, break on some carriers, and can't be pre-attached from a link). So the text carries a **link**, and the page it opens shows the QR big and first.

## What changes

1. **New line in the payment text** — right under the "To use Zelle: ..." sentence:
   `Or scan the QR code here: https://tasteofconventions.com/meals/<cuisine>`
   - Inserted through a new `{zelle_qr_link}` placeholder, added to the built-in default wording so both Admin → Meal texts and My meal texts pick it up.
   - The line disappears automatically for any restaurant with no QR saved.

2. **QR moved to the top of the meal page** (`/meals/myanmar`, `/meals/indonesian`, `/meals/african`)
   - A "Pay with Zelle — scan this" card at the top of the payment section: large QR, the Zelle name and phone beneath it, and a tap-to-enlarge full-screen view for scanning from another phone.
   - Keeps the existing phone/name text so people who don't use QR are unaffected.

3. **QR also on the guest's own RSVP meal card** — same compact QR next to the pay instructions, so a guest who never opens the meal page still sees it.

4. **Typo pass**: after you send me your corrected wording, I paste it into the saved template and read it back from the database to confirm it's live (that is the same verified save path we fixed tonight).

## Technical notes

- `src/lib/meal-text-message.ts`: add `zelleQrLink` to `MealTextContext`, build it in `paymentLines`-adjacent logic from `zelle_qr_url` + cuisine slug, and map `{zelle_qr_link}` in `renderMealTemplate`.
- `src/lib/meal-text-defaults.ts`: add the placeholder line to `DEFAULT_MEAL_TEXT_TEMPLATE` / `DEFAULT_ZELLE_UPDATE_TEMPLATE`.
- Restaurant row selects already include `zelle_qr_url` in `meal-texts.functions.ts` and `committee-meal-texts.server.ts` — no query changes needed.
- `src/components/meal-restaurant-contact.tsx`: promote the QR block to the top of the payment area with an enlarge dialog.
- Admin placeholder help text updated to list `{zelle_qr_link}`.
- No database migration; no change to counts, payments, or RSVP records.

## Verification

- Preview at 384px on `/meals/myanmar`, `/meals/indonesian`, `/meals/african`: QR renders and enlarges.
- Admin → Meal texts: preview a text for each cuisine and confirm the QR link line is present and points at the right cuisine page.
- Read the saved wording back from the database after any wording change.
