# New catered-meal text wording (2026-08-11)

Your latest wording becomes the live saved template and the built-in default for both meal texts (Admin → Meal texts and My meal texts). Prices, cuisine, order and Zelle details stay as placeholders so each restaurant fills in its own.

## The wording that gets saved

```text
IMPORTANT UPDATE:

REGARDING Your Catered Meal Pre-Order

Hi {first_name} —

This is an update regarding your Taste of Conventions catered pre-meal request.

Each restaurant has provided Zelle to pre-pay with. Paying with Zelle guarantees your meal. Catered meal pre-pay cut off is AUGUST 23RD.

For {restaurant_cuisine} your choices are:

{meal_choices}

{pay_sentence}

{zelle_qr_link}

Your order is for {order}.

{meal_photos}

These custom made meals are for our event and will be prepared free of gluten, seed oils, and msg. Each meal has been tasted by the Food Tasting Committee to ensure the quality.

Once your payment is received, the restaurant will update your profile to PAID. Your receipt will be in your bank account and in your RSVP to ensure your meal is accounted for.

Any issues, please text Kari Gray at 808.278.7562 with a screenshot/and explanation.

August 23rd is the last day to prepay.

Once at the Taste of Conventions event, please present your RSVP receipt at the event in order to obtain your meal.

Thank you for your support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

## What the placeholders produce (African example, read from the database)

- `{restaurant_cuisine}` → `an authentic African meal`
- `{meal_choices}` → `Chicken Meal plate $21.90` / `Beef Meal plate $27.38`
- `{pay_sentence}` → `To use Zelle: search 402-939-9093 (Senait T Gebremichael)`
- `{zelle_qr_link}` → `Or scan the Zelle QR code here: https://tasteofconventions.com/meals/african`
- `{order}` → `1 African meal plate`
- `{meal_photos}` → `See the food images here: https://tasteofconventions.com/meals/african`

Myanmar and Indonesian fill in their own prices, Zelle names/phones and QR links the same way (Burmese $21.80/$27.25, Koen $24/$29). The gluten / seed-oil / MSG line shows for all three restaurants, as confirmed.

## Technical notes

- `src/lib/meal-text-defaults.ts`: replace `MEAL_TEXT_UPDATE_INTRO`, `DEFAULT_MEAL_TEXT_TEMPLATE` and `DEFAULT_ZELLE_UPDATE_TEMPLATE` with the wording above.
- `src/lib/meal-text-message.ts`:
  - `cuisineLabel` / the cuisine used for `{restaurant_cuisine}` renders as `an authentic African meal`, `an authentic Indonesian meal`, `an authentic Myanmar (Burmese) meal`.
  - `paymentLines`: `mealChoices` becomes `Chicken Meal plate $X` / `Beef Meal plate $Y`.
  - `mealOrderText`: `1 African meal plate` / `2 African meal plates`.
  - `mealPhotosLine`: "See the food images here:" (was "at:").
- Save the same wording into the `meal_text_template` and `meal_zelle_text_template` rows in `app_settings` and read it back to confirm.
- No migration to counts, payments, RSVPs, or QR images; the QR still shows on `/meals/<cuisine>` and the RSVP meal card.

## Verification

- Database read-back of both saved templates after the change.
- Admin → Meal texts: preview one text per cuisine (African, Indonesian, Myanmar) and confirm prices, plate wording, Zelle line and QR link all match the right restaurant.
- 384px check of My meal texts so the text a committee member sends matches the preview.
