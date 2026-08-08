# New catered-meal text wording (2026-08-08 06:3x UTC)

## 1. The catered-meal text becomes your exact new wording

```text
UPDATE!

REGARDING Your Catered Meal.

Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and ordered a catered meal, the following information is how to pre-pay for your catered meal online instead of calling the restaurant and paying over the phone.

The restaurants have provided a virtual pre-pay alternative Zelle. One offers Venmo too.

Thank you for your patience and understanding as this is a first for all of us.

{restaurant_name} — {restaurant_cuisine}

{restaurant_zelle}

Your order is for {order}.

How to pay:

{payment_options}

{online_prices}

{meal_photos}

The restaurant will verify your prepaid meal(s). If you don't see confirmation in your RSVP within 48 hrs, please text 808.278.7562. These meals are exclusively for our event.

August 23rd is the cut off for payment for your Taste of Conventions event meal

Your receipt will be both in your bank account and will be in your RSVP at tasteofconventions.com.
Please present at the event your purchase receipt to obtain your meal.

Thank you for your support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

Your stray "Chicken" and "Beef" lines are folded into `{online_prices}`, which already prints both labeled prices, so they show real amounts instead of empty words.

The Zelle-update follow-up text keeps its own body, but its opening lines are reworded to match the new "UPDATE! / REGARDING Your Catered Meal." intro.

## 2. Chicken, beef and Zelle/Venmo always visible

`{online_prices}` prints, per restaurant:

```text
Chicken $21.80
Beef $27.25
(includes tax)
```

Amounts from each restaurant's saved prices — Burmese $21.80 / $27.25, Indonesian $24 / $29 (includes tax and delivery fees), African $21.90 / $27.38 (includes tax).

`{restaurant_zelle}` prints that restaurant's Zelle line, plus Venmo only for Koen. `{payment_options}` lists Zelle first, then Venmo where offered, then the phone number as the alternative.

## What does not change

Guest RSVP pages, restaurant portals, saved prices, texted / Zelle-update tracking marks, and your ability to edit the wording on Admin → Meal texts.

## Technical detail

- `src/lib/meal-text-defaults.ts`: replace `MEAL_TEXT_UPDATE_INTRO` with the new "UPDATE! / REGARDING Your Catered Meal." opening and `DEFAULT_MEAL_TEXT_TEMPLATE` with the wording above; keep `DEFAULT_ZELLE_UPDATE_TEMPLATE` structure with the new intro.
- No change needed to `src/lib/meal-text-message.ts` (placeholders already exist).
- `public.app_settings`: update the saved `meal_text_template` override (and the Zelle-update override if present) so live texts use the new wording immediately.
- Verification: read the `app_settings` rows back, then Playwright at 384x681 on `/admin/meal-texts` and `/admin/meal-texts-mine` to confirm one real guest per cuisine renders the new body with the right Zelle line and both chicken and beef prices.
