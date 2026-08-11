# Zelle QR codes visible + your revised wording live

All three restaurants already have a QR image saved (Burmese, Koen, Lalibela). Right now the QR only shows if a guest scrolls the meal page, and the payment text only gives the Zelle phone/name.

A text sent from your own phone can't reliably carry an image, so the text carries a **link** and the page it opens shows the QR big and first.

## What changes

1. **Your revised wording becomes the live saved message and the built-in default**, exactly as you wrote it, with one added line for the QR (see below). It's saved to the database and read back to confirm, so Admin → Meal texts and My meal texts both use it.

2. **New QR line in the text**, right after the "To use Zelle..." sentence:
   `Or scan the QR code here: https://tasteofconventions.com/meals/<cuisine>`
   Added via a `{zelle_qr_link}` placeholder; it disappears for any restaurant with no QR saved.

3. **QR moved to the top of the meal page** (`/meals/myanmar`, `/meals/indonesian`, `/meals/african`): a "Pay with Zelle — scan this" card with a large QR, the Zelle name and phone beneath, and tap-to-enlarge for scanning from another phone. The existing phone/name text stays.

4. **QR also on the guest's own RSVP meal card**, so a guest who never opens the meal page still sees it.

## The wording that gets saved

```text
UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

This is an update regarding your Taste of Conventions catered meal pre-order.

The following information is how to pre-pay using a secure method.

Each of the restaurants have provided a Zelle option which is secured way to pay direct.

For {restaurant_cuisine} your choices are:

{meal_choices}

{pay_sentence}

{zelle_qr_link}

Your order is for {order}.

{meal_photos}

The restaurant will verify your payment has been received within 72 hrs. You will receive a receipt from your bank and your RSVP will be updated.

August 23rd is the last day to prepay.

Please present your receipt at the Taste of Conventions event in order to obtain your meal.

If you decide to not purchase your meal, please login to your RSVP and cancel your pre-order.

Bringing a covered dish is the alternative ensuring no one is left out.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

The only edits to your text: the `{zelle_qr_link}` line added, and the double period after "72 hrs.." reduced to one. Say the word if you want either left alone.

## Technical notes

- `src/lib/meal-text-message.ts`: add `zelleQrLink` to `MealTextContext`, build it from `zelle_qr_url` + cuisine slug, map `{zelle_qr_link}` in `renderMealTemplate`.
- `src/lib/meal-text-defaults.ts`: replace `DEFAULT_MEAL_TEXT_TEMPLATE` / `DEFAULT_ZELLE_UPDATE_TEMPLATE` with the wording above.
- Save the same wording into the `meal_zelle_text_template` / `meal_text_template` settings rows and read back from the database.
- Restaurant selects already include `zelle_qr_url` in `meal-texts.functions.ts` and `committee-meal-texts.server.ts` — no query changes.
- `src/components/meal-restaurant-contact.tsx`: promote the QR to the top of the payment area with an enlarge dialog; reuse on the RSVP meal card.
- Admin placeholder help text updated to list `{zelle_qr_link}`.
- No migration; no change to counts, payments, or RSVP records.

## Verification

- 384px preview of `/meals/myanmar`, `/meals/indonesian`, `/meals/african`: QR renders and enlarges.
- Admin → Meal texts: preview a text per cuisine and confirm the QR link points at the right cuisine page and the new wording shows.
- Database read-back of the saved wording after the change.
