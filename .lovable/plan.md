# Updated catered-meal text wording (2026-08-11 03:19 UTC)

Your latest wording becomes the live saved template and the built-in default for both meal texts (Admin → Meal texts and My meal texts). Cuisine, prices, QR link and Zelle phone/name stay placeholders so each restaurant fills in its own.

## The wording that gets saved

```text
UPDATE REGARDING Your Catered Meal!

Hi {first_name} —

The following information is how to pre-pay for your catered meal. Each restaurant provides Zelle which is secure and direct.

Your pre-order is for {order}.

{restaurant_cuisine} meal choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

The restaurant will verify your payment within 72 hrs. You will have both a bank receipt and your RSVP.

August 23rd is the last day to prepay which guarantees your meal.

At the event, please present your RSVP receipt for your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

You may opt to bring a covered dish as an alternative to pre-paying for a catered meal. Ensuring all have food for the event means pre-planning for all of us.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

## What the placeholders produce (African, read from the database)

- `{order}` → `1 African meal`
- `{restaurant_cuisine}` → `African`
- `{meal_choices}` → `Chicken Meal plate $21.90` / `Beef Meal plate $27.38`
- `{zelle_qr_link}` → `To prepay, please click here https://tasteofconventions.com/meals/african`
- `{pay_sentence}` → `You can use either the QR code or search by phone number 402-939-9093 (Senait T Gebremichael)`

Restaurants with no QR saved simply have no QR line, and their pay sentence falls back to the phone-search wording without the QR mention. Myanmar and Indonesian fill in their own prices, Zelle names/phones and links the same way.

## Technical notes

- `src/lib/meal-text-defaults.ts`: replace `DEFAULT_MEAL_TEXT_TEMPLATE` (and therefore `DEFAULT_ZELLE_UPDATE_TEMPLATE`) with the wording above.
- `src/lib/meal-text-message.ts`:
  - `zelleQrLinkLine` → `To prepay, please click here <url>`.
  - `paySentence` → `You can use either the QR code or search by phone number <phone> (<name>)` when a QR exists; `You can search by phone number <phone> (<name>)` when it doesn't. Venmo/phone-only fallbacks unchanged.
- Save the same wording into the `meal_text_template` and `meal_zelle_text_template` rows in `app_settings`, then read it back to confirm.
- No change to counts, payments, RSVPs, QR images, or the `/meals/<cuisine>` pages.

## Verification

- Database read-back of both saved templates after the change.
- Render one sample text per cuisine (African, Indonesian, Myanmar) and confirm link, Zelle line and prices match that restaurant.
- 384px check of My meal texts so a committee member's text matches the preview.
