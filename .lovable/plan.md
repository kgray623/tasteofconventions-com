# New catered-meal text wording (2026-08-11)

Your latest wording becomes the live saved template and the built-in default for both meal texts (Admin → Meal texts and My meal texts). Cuisine, prices, order and Zelle details stay as placeholders so each restaurant fills in its own.

## The wording that gets saved

```text
UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

This is an update to your Taste of Conventions catered pre-order meal.

The following information is how to pre-pay. Each restaurant has provided Zelle which is secure and direct.

For {restaurant_cuisine} your choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

Your order is for {order}.

The restaurant will verify your payment within 72 hrs and your RSVP will be updated and verified.

August 23rd is the last day to prepay.

Please present your receipt at the Taste of Conventions event in order to obtain your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

Bringing a covered dish is the alternative to a pre-paid catered meal ensuring no one is left out of the festivities.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

Two small fixes to what you typed: "Each restaurants has" → "Each restaurant has", and the missing closing parenthesis after the Zelle name (the `{pay_sentence}` placeholder already closes it). The gluten/seed-oil line, the "IMPORTANT UPDATE" heading, the "plate" wording and the food-images line are all dropped, matching this version.

## What the placeholders produce (African, read from the database)

- `{restaurant_cuisine}` → `African`
- `{meal_choices}` → `Chicken Meal $21.90` / `Beef Meal $27.38`
- `{zelle_qr_link}` → `Use the Zelle QR code: https://tasteofconventions.com/meals/african`
- `{pay_sentence}` → `Or use Zelle phone search 402-939-9093 (Senait T Gebremichael)`
- `{order}` → `1 African meal`

Note: your text says Beef $27.39; the saved price for Lalibela is $27.38, so the text will send $27.38. Say the word if the restaurant's price should change to $27.39.

Myanmar and Indonesian fill in their own prices, Zelle names/phones and QR links the same way (Burmese $21.80/$27.25, Koen $24/$29). Any restaurant with no QR saved simply has no QR line.

## Technical notes

- `src/lib/meal-text-defaults.ts`: replace `MEAL_TEXT_UPDATE_INTRO`, `DEFAULT_MEAL_TEXT_TEMPLATE` and `DEFAULT_ZELLE_UPDATE_TEMPLATE` with the wording above.
- `src/lib/meal-text-message.ts`:
  - `zelleQrLinkLine` wording becomes `Use the Zelle QR code: <url>` (was "Or scan the Zelle QR code here:").
  - `paySentence` wording becomes `Or use Zelle phone search <phone> (<name>)`; unchanged fallbacks for Venmo-only / phone-only restaurants.
  - `mealChoices` and `mealOrderText` stay as they are today (no "plate").
- Save the same wording into the `meal_text_template` and `meal_zelle_text_template` rows in `app_settings`, then read it back to confirm.
- No change to counts, payments, RSVPs, or the QR images; the QR still shows on `/meals/<cuisine>` and the RSVP meal card.

## Verification

- Database read-back of both saved templates after the change.
- Admin → Meal texts: preview one text per cuisine (African, Indonesian, Myanmar) and confirm the QR link, Zelle line and prices match the right restaurant.
- 384px check of My meal texts so what a committee member sends matches the preview.
