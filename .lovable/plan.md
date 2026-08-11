# New catered-meal text wording (2026-08-11 22:0x UTC)

Your pasted message becomes the live saved template and the built-in default for both meal texts (Admin → Meal texts and My meal texts). Cuisine, order, prices, QR link and Zelle phone/name stay placeholders so each restaurant and guest fills in their own.

## The wording that gets saved

```text
IMPORTANT UPDATE REGARDING Your Taste of Conventions catered meal!

Hi {first_name} —

The following information is how to pay your catered meal pre-order. Each restaurant has provided Zelle which is secure and direct.

Your pre-order is for {order} and {restaurant_cuisine} meal choices are:

{meal_choices}

{zelle_qr_link}

Or open Zelle in your bank app, then {pay_sentence}

The restaurant will verify your payment within 72 hrs. You will have both a bank receipt and your RSVP securing your meal.

August 23rd is the last day to prepay catered meals to guarantee your meal, and give the restaurant time to prepare.

When you're at the event, please present your RSVP receipt for your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

You may opt to bring a covered dish as an alternative to pre-paying a catered meal. Ensuring all have food for the event takes pre-planning for all of us.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all of us! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

## What the placeholders produce (Tina, African, read from the database)

- `{order}` → `1 African meal`
- `{restaurant_cuisine}` → `African`
- `{meal_choices}` → `Chicken Meal plate $21.90` / `Beef Meal plate $27.38`
- `{zelle_qr_link}` → `Click here to pay using Zelle QR code: https://tasteofconventions.com/meals/african`
- `{pay_sentence}` → `search phone number 402-939-9093 (Senait T Gebremichael)`

Indonesian and Myanmar fill in their own prices, Zelle names/phones and links the same way. A restaurant with no meal page simply has no QR line.

## Technical notes

- `src/lib/meal-text-defaults.ts`: replace `DEFAULT_MEAL_TEXT_TEMPLATE` (and therefore `DEFAULT_ZELLE_UPDATE_TEMPLATE`) with the wording above; update `MEAL_TEXT_UPDATE_INTRO` to the new headline.
- `src/lib/meal-text-message.ts`:
  - `zelleQrLinkLine` → `Click here to pay using Zelle QR code: <url>`.
  - `paySentence` → `search phone number <phone> (<name>)` (Venmo/phone-only fallbacks unchanged).
- Save the same wording into the `meal_text_template` and `meal_zelle_text_template` rows in `app_settings`, then read both back to confirm.
- No change to counts, payments, RSVPs, QR images, tracking marks, or the `/meals/<cuisine>` pages.

## Verification

- Database read-back of both saved templates after the change.
- Render one sample text per cuisine (African, Indonesian, Myanmar) and confirm order line, prices, QR link and Zelle search line match that restaurant.
- 384×681 check of Admin → Meal texts and My meal texts, including the Kari Gray mock rows, so the live preview matches the wording exactly.
