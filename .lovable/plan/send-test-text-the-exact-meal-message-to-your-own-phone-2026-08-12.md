# Send test — text the exact meal message to your own phone

The "Test on yourself" panel was built but is never placed on any screen: nothing in the app renders `MealTextSelfTest`, which is why you still have no test button on `/admin/meal-texts`. This plan puts it on that page and prefills it with your own number.

## What you'll get

At the top of the Meal payment texts page, an admin-only panel **Test on yourself — nothing is recorded**:

- One row per cuisine (African, Indonesian, Myanmar), each showing the full message text exactly as a guest receives it — same wording, prices, Zelle name/phone, and QR link as the live queue.
- A **Text myself the ... message** button per cuisine that opens your phone's Messages app pre-filled to your own number with that exact message. You tap send, so the message is real and verifiable.
- Name, phone, and meals-per-cuisine fields, prefilled with your name and 808-278-7562, so a retest is one tap.
- A **Copy message** button per cuisine for reading or pasting.
- Sending a test records nothing: no "texted" mark, no payment row, no change to any guest, meal, or count, and it never appears in anyone's activity.

Note on wording: the platform never sends SMS by itself — every text goes from your own phone through Messages. The button prefills and opens Messages; you press send. Same behavior as the live Text buttons.

## Technical notes

- Render `MealTextSelfTest` at the top of `src/routes/_authenticated/admin/meal-texts.tsx`, gated to admins, passing the already-loaded `restaurants`, `zelleTemplate`, and `self` from `getMealTextData`.
- Prefill fallback: if `self.phone` comes back blank, seed the phone field from the retained preorder phone already returned in `kariTestRows`, so the buttons are live on first load.
- No new server function, no template copy (it reuses `renderMealTemplate` in `src/lib/meal-text-message.ts`), no migration, no data change.

## Verification before I report back

- Load `/admin/meal-texts` at 384x681 as admin and confirm the panel is on screen with all three cuisine rows.
- Confirm each rendered body matches the current live wording for that restaurant (prices, Zelle name/phone, QR link).
- Confirm each `sms:` link targets 808-278-7562 and carries the full body.
- Read the database back after tapping to confirm zero new rows in `meal_text_sends`, `meal_zelle_text_sends`, and `meal_payments`.
