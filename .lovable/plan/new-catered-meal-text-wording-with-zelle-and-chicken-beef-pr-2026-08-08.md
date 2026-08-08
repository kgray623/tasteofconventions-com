# New catered-meal text wording, with Zelle and chicken/beef prices always visible

Plan written 2026-08-08 05:1x UTC.

## 1. The main meal text becomes your exact new wording

```text
UPDATE REGARDING Your Catered Meal. The restaurants have given us a virtual pre-pay option for catered meals through Zelle. One offers Venmo too.

Thank you for your understanding as this is a first for all of us.

Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and ordered a catered meal, the following is the information to pay for your catered meal direct online instead of calling the restaurant and paying over the phone.

Thank you for your patience and understanding as this is a first for all of us.

{restaurant_name} — {restaurant_cuisine}
{restaurant_zelle}

Your order is for {order}.

How to pay:
{payment_options}
{online_prices}

{meal_photos}

The restaurant has been notified you will be prepaying your meal, as they are making these meals exclusively for our event.
Please dear friend, pay by August 23rd to ensure your meal is ready for your arrival at the Taste of Conventions event.
Your receipt will be in your bank and will be in your RSVP at tasteofconventions.com. Please present at the event your purchase receipt to obtain your meal.
Thank you for your support in making this an encouraging experience for all! 😊
The Taste of Conventions Food Committee
```

The old wording (restaurant phone line, "call to pre pay promptly", "Save your receipt…") is replaced. The Zelle-update follow-up text keeps its own wording, but its intro paragraph is reworded to match the shortened first sentence above.

## 2. New `{restaurant_zelle}` placeholder

Prints that restaurant's own pay-online identity, and Venmo only when the restaurant has one:

- Burmese: `Zelle: 310-595-6907 (Asian Burmese Restaurant)`
- Koen (Indonesian): `Zelle: 402-853-2509 (Inez Retnosari)` + `Venmo: @Inez-Retnosari`
- Lalibela (African): `Zelle: 402-939-9093 (Senait T Gebremichael)`

## 3. Chicken and beef prices always visible, per restaurant

`{online_prices}` becomes two labeled lines instead of one sentence, so both choices are always readable (your stray "Chicken / Beef" lines are folded into this):

```text
Chicken $21.80
Beef $27.25
(includes tax)
```

Amounts come from each restaurant's saved prices — Burmese $21.80 / $27.25 (includes tax), Indonesian $24 / $29 (includes tax and delivery fees), African $21.90 / $27.38 (includes tax). `{payment_options}` continues to list Zelle first, then Venmo where offered, then the phone number as the alternative.

## What does not change

Guest RSVP pages, restaurant portals, prices in the database, texted / Zelle-update tracking marks, and the ability to edit the wording yourself on Admin → Meal texts.

## Technical detail

- `src/lib/meal-text-defaults.ts`: replace `DEFAULT_MEAL_TEXT_TEMPLATE` with the wording above; shorten `MEAL_TEXT_UPDATE_INTRO` first sentence.
- `src/lib/meal-text-message.ts`: add `restaurantZelle` to `MealTextContext` and `{restaurant_zelle}` to `renderMealTemplate`; `paymentLines()` returns the new labeled `onlinePrices` block plus a `zelleBlock` string.
- `src/routes/_authenticated/admin/meal-texts.tsx` and `meal-texts-mine.tsx`: pass `restaurantZelle`, and list `{restaurant_zelle}` in the placeholder help text.
- `public.app_settings`: update the saved `meal_text_template` override (and the Zelle-update override if present) so live texts use the new wording immediately.
- Verification: read the `app_settings` rows back, then Playwright at 384x681 on `/admin/meal-texts` and `/admin/meal-texts-mine` to confirm one real guest per cuisine renders the new body with the right Zelle line and both chicken and beef prices.
