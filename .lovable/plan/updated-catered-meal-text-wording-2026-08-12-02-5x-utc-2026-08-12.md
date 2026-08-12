# Updated catered-meal text wording (2026-08-12 02:5x UTC)

Your newest wording becomes the live saved template and the built-in default for both meal texts (Admin → Meal texts, My meal texts, and the Test-on-yourself panel). Cuisine, prices, QR link, Zelle phone/name and Venmo stay placeholders so each restaurant fills in its own.

## The wording that gets saved

```text
IMPORTANT UPDATE REGARDING Your Taste of Conventions catered meal!

Hi {first_name} —

The following information is how to pay for your catered pre-ordered meal. Each restaurant has provided Zelle for payment which is secure.

All meals are gluten-free, seed oil free (using butter or beef tallow) and MSG free.

Your pre-order {restaurant_cuisine} meal choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

The restaurant will verify your payment within 72 hrs.

You will have both a bank receipt and your RSVP verifying your meal purchase.

August 23rd is the last day to prepay for catered meal(s). Pre-paying guarantees your meal at the event.

If you don't want to pre-purchase a catered meal, please cancel your pre-order on your RSVP. Please bring a covered dish to share, so everyone has a meal to share together.

Thank you for your support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

## What the placeholders produce (Indonesian, read from the database)

- `{restaurant_cuisine}` → `Indonesian`
- `{meal_choices}` → `Chicken Meal plate $24` and `Beef Meal plate $29` on back-to-back lines (no blank line between them, matching your latest version)
- `{zelle_qr_link}` → `Click here to pay using Zelle: https://tasteofconventions.com/meals/indonesian`
- `{pay_sentence}` → `Or open Zelle in your bank app. Search phone number 402-853-2509 (Inez Retnosari) or Venmo: @Inez-Retnosari`

African and Myanmar fill in their own prices, Zelle name/phone and link the same way. A restaurant with no Venmo simply ends the pay line after the Zelle name; a restaurant with no QR page has no "Click here" line.

Note: this version no longer states the quantity ordered ("1 Indonesian meal") — it only lists the cuisine's meal choices, exactly as you wrote it. Say the word if you want the quantity line kept.

## Technical notes

- `src/lib/meal-text-defaults.ts`: replace `MEAL_TEXT_UPDATE_INTRO` and `DEFAULT_MEAL_TEXT_TEMPLATE` (`DEFAULT_ZELLE_UPDATE_TEMPLATE` follows it) with the wording above.
- `src/lib/meal-text-message.ts`:
  - `zelleQrLinkLine` → `Click here to pay using Zelle: <url>`.
  - `paySentence` → `Or open Zelle in your bank app. Search phone number <phone> (<name>)`, plus ` or Venmo: @<handle>` when the restaurant has Venmo. Venmo-only and phone-only fallbacks unchanged.
  - `mealChoices` joins the chicken and beef lines with a single newline instead of a blank line.
- Save the same wording into the `meal_text_template` and `meal_zelle_text_template` rows in `app_settings`, then read both back to confirm.
- No change to counts, payments, RSVPs, sent marks, QR images, or the `/meals/<cuisine>` pages.

## Verification

- Database read-back of both saved templates after the change.
- `/admin/meal-texts` at 384×681: confirm the Indonesian sample matches your text exactly, and African and Myanmar render their own prices, link and Zelle contact.
- Confirm the Test-on-yourself panel builds the same message to 808-278-7562 and records nothing.
