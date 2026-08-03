# Fix "Text" buttons + use your exact meal message

2026-08-03 20:2x UTC

## 1. The Text button doesn't open Messages

On `/admin/meal-texts-mine` each Text button is a plain link (`<a href="sms:...">`) rendered inside the preview frame. Framed pages block `sms:` navigation, so the tap marks the row "texted" but nothing opens. The same shape is used on the admin-wide `/admin/meal-texts` page.

Fix (same approach that fixed the CSV downloads):

- Add a shared `openSms(numbers, body)` helper that hands the `sms:` URL to the top-level document (top window location / injected anchor into `window.top.document`), with a fallback to `window.location.assign`.
- Replace the `asChild` + `<a>` buttons with real click handlers: open the SMS app first, then mark the row/group as texted.
- Build the URL as `sms:<numbers>?body=<encoded>` (drop the stray `&`), and use `sms:/open?addresses=` style only where needed for multi-recipient — keep single-recipient simple, which is what actually works on Android and iOS.
- If the SMS app can't be opened, show the existing copy fallback ("Message copied — paste it into Messages") instead of silently marking as texted.
- Verify on a phone-sized viewport that tapping Text triggers a real `sms:` navigation attempt (captured request), not a no-op.

## 2. Your exact message wording

Replace the message body everywhere with:

```text
Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and pre ordered a catered meal, the following is the contact information for the restaurant to pre-pay your catered meal direct.

{restaurant_name} — {restaurant_phone}
{restaurant_website}

Your order is for {order}

The restaurant has been notified you will call to pre pay your meal, so please do so promptly.

Save your receipt to present at the event in order to verify your purchase and obtain your meal.

Thank you! 😊
```

This is set in two places, both of which will be updated so the new wording is what actually sends:

- the default template in code (`src/lib/meal-text-defaults.ts`)
- the saved template row in the database (`app_settings.meal_text_template`), which currently holds the old wording and overrides the default

The restaurant name/phone/website lines stay in (otherwise the text has no contact info to call); wording otherwise matches yours exactly. Admins can still edit the wording on `/admin/meal-texts`.

## Technical notes

- New helper in `src/lib/meal-text-message.ts`: `openSms()`; `smsHref()` kept for the copy/fallback path.
- Edits: `src/routes/_authenticated/admin/meal-texts-mine.tsx`, `src/routes/_authenticated/admin/meal-texts.tsx`, `src/lib/meal-text-defaults.ts`, plus one migration/update for `app_settings`.
- No change to referral scoping, "Mark as texted" data, or restaurant records.
