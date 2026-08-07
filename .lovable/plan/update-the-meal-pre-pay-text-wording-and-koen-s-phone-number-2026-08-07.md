# Update the meal pre-pay text wording and Koen's phone number

2026-08-07 02:5x UTC

## Confirmed current state

- The saved template (in app settings, key `meal_text_template`) and the code default both read:
  `{restaurant_name} — {restaurant_phone}` on one line, website on the next, and `Your order is for {order}` with no ending period.
- Koen is stored with phone `(531) 213-2708`, website `https://koenblackstone.com`, cuisine `Indonesian`.
- That same Koen phone number is the restaurant portal password (username `Koen`).

## Changes

1. **New wording** (keeps the guest's first name, as you confirmed):

```text
Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and pre ordered a catered meal, the following is the contact information for the restaurant to pre-pay your catered meal direct.

{restaurant_name} — {restaurant_cuisine} the phone number is {restaurant_phone}

{restaurant_website}

Your order is for {order}.

The restaurant has been notified you will call to pre pay your meal, so please do so promptly.

Save your receipt to present at the event in order to verify your purchase and obtain your meal.

Thank you! 😊
```

2. Add a `{restaurant_cuisine}` field so the cuisine (Indonesian / African / Myanmar (Burmese)) appears in the restaurant line for every restaurant, not just Koen.
3. Save the new wording as both the stored template and the built-in default, so the Admin → Meal texts page, the committee "Text your guests" page, and the Reset-to-default button all produce the identical message.
4. **Koen's phone number becomes (402) 853-2509** everywhere: guest texts, the Admin → Restaurants portal-login block, and Koen's portal password. The old number stops working for login.

## Not changed

- No RSVP, guest, meal-order, referral, or "texted" tracking data is touched.
- Burmese and Lalibela phone numbers and logins stay as they are.

## Verification

- Read the stored template back from the database and confirm it matches the wording above character for character.
- Open Admin → Meal texts at 384×681 mobile, pick an Indonesian order, and confirm the preview reads "Koen — Indonesian the phone number is (402) 853-2509" with "Your order is for 1 Indonesian meal."
- Confirm the same preview on the committee "Text your guests" page.
- Sign in at `/restaurant` as `Koen` with `4028532509` and confirm the order list loads; confirm the Admin → Restaurants login block shows the new number.

## Technical details

- `src/lib/meal-text-defaults.ts` — `DEFAULT_MEAL_TEXT_TEMPLATE`.
- `src/lib/meal-text-message.ts` — `MealTextContext` + `renderMealTemplate` gain `restaurantCuisine` / `{restaurant_cuisine}`.
- Callers passing the context: Admin meal-texts route and the committee meal-texts route/components.
- Data updates: `app_settings.meal_text_template`, `restaurants.phone` for Koen, and the `restaurant_portal_access` code hash for Koen.
