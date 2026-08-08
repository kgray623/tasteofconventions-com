# New catered-meal text wording (one message per cuisine)

Replace the meal text wording with your exact new message. Sending stays as it already is: one separate text per guest per cuisine, so a guest with two cuisines gets two different messages.

## The message that will be sent

```text
UPDATE REGARDING Your Catered Meal!

Hi Kari —

This is an update regarding your Taste of Conventions catered meal.

The following information is how to pre-pay using a secure method. Each of the restaurants have provided a Zelle option which is secured.

Thank you for your understanding in this matter.

For Indonesian your choices are:

Chicken Meal $24

Beef Meal $29

To use Zelle: search 402-853-2509 (Inez Retnosari) or to Venmo: @Inez-Retnosari

Your order is for 1 Indonesian meal.

See the food images at: https://tasteofconventions.com/meals/indonesian

The restaurant will verify your payment. You will have a receipt from your bank and your RSVP will be updated.

August 23rd is the last day to prepay.

Please present your RSVP receipt at the event when obtaining your meal.

Thank you dear friend for your support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee
```

Per restaurant, the cuisine name, prices, and the Zelle/Venmo line fill in automatically:

- Indonesian (Koen): Chicken $24, Beef $29 — Zelle 402-853-2509 (Inez Retnosari), Venmo @Inez-Retnosari
- African (Lalibela): Chicken $21.90, Beef $27.38 — Zelle 402-939-9093 (Senait T Gebremichael)
- Myanmar/Burmese: Chicken $21.80, Beef $27.25 — Zelle 310-595-6907 (Asian Burmese Restaurant)

Small correction: your pasted line read "search i402-853-2509"; the stray "i" is dropped so the number is searchable.

The same wording is used for both the main meal text and the Zelle-update follow-up text, so every send uses one approved message. The wording stays editable in the wording box on Admin → Meal texts and My meal texts.

## Technical notes

- `src/lib/meal-text-defaults.ts`: rewrite `DEFAULT_MEAL_TEXT_TEMPLATE` and `DEFAULT_ZELLE_UPDATE_TEMPLATE` to the wording above using placeholders `{first_name}`, `{restaurant_cuisine}`, `{meal_choices}`, `{pay_sentence}`, `{order}`, `{meal_photos}`.
- `src/lib/meal-text-message.ts`: add two derived values in `paymentLines()` / `renderMealTemplate()`:
  - `{meal_choices}` → `Chicken Meal $X` / `Beef Meal $Y` on separate lines (blank-line spacing as pasted), from `chicken_price` / `beef_price`.
  - `{pay_sentence}` → `To use Zelle: search <zelle_phone> (<zelle_name>)` plus ` or to Venmo: @<handle>` only when the restaurant has Venmo.
  - Keep `{online_prices}`, `{restaurant_zelle}`, `{payment_options}` working for backward compatibility with any saved custom template.
- Update the `meal_text_template` and `meal_zelle_text_template` rows in `public.app_settings` so live sends use the new wording immediately (the saved override otherwise wins over the code default).
- Update the placeholder help lines on `src/routes/_authenticated/admin/meal-texts.tsx` and `meal-texts-mine.tsx` to list `{meal_choices}` and `{pay_sentence}`.
- Verification: render the SMS body for one real guest per cuisine (Myanmar, African, Indonesian) and confirm the exact wording, correct prices, correct Zelle/Venmo line, correct order line and photo link; confirm two-cuisine guests produce two separate messages.
