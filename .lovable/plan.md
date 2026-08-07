# Add Zelle/Venmo to meal texts + a separate "Zelle update" list

Plan written 2026-08-07 21:4x UTC.

## 1. Online payment prices per cuisine

Because Zelle/Venmo payments are paid in full up front, each cuisine gets tax-and-fee-included prices:

- Indonesian (Koen): chicken $24, beef $29 — includes tax and delivery fees
- African (Lalibela): chicken $21.90, beef $27.38 — includes tax
- Burmese (Myanmar): pending — the restaurant is sending them. Until they arrive, Burmese texts show no online price line, only the Zelle name/number.

These are stored per restaurant so you can edit them yourself in Admin → Restaurants (chicken price, beef price, and a short "includes" note).

## 2. Main meal text gains payment options

The default message keeps its current wording and adds a payment block, filled in per restaurant, showing only what that restaurant accepts:

```text
Pay by phone: (402) 853-2509
Venmo: @Inez-Retnosari
Zelle: 402-853-2509 (Inez Retnosari)
If you pay by Zelle or Venmo: chicken $24, beef $29 — includes tax and delivery fees.
```

You can still edit the template on Admin → Meal texts; new placeholders are available:
`{payment_options}`, `{zelle_line}`, `{venmo_line}`, `{online_prices}`.

## 3. New "Zelle update" list — only guests already texted

A separate tab on Admin → Meal texts (and on the committee page "My meal texts") titled **Zelle update**:

- Lists only the guest meals already marked as texted (43 marks today, per meal/cuisine).
- Its own short editable message, e.g.:

```text
Hi {first_name} — quick update on your {restaurant_cuisine} meal.
You can now pay by Zelle or Venmo instead of calling:
{payment_options}
{online_prices}
Please pay by Sunday, August 23 and save your confirmation.
```

- Its own separate "Zelle update sent" checkmark and count, fully independent of the original "texted" mark, so neither can affect the other. A guest only leaves this list when you check them off after actually sending the update.
- Same Text button behavior as today (opens Messages with the message prefilled; nothing sends automatically) and the same one-guest-at-a-time marking rule.

Nothing about the existing main list, counts, orders, confirmations, or paid receipts changes.

## Technical detail

- Migration: add `chicken_price numeric`, `beef_price numeric`, `price_note text` to `public.restaurants` (nullable). New table `public.meal_zelle_text_sends` (`preorder_id`, `cuisine`, `sent_at`, `marked_by`, `marked_by_label`, unique on `preorder_id, cuisine`) with GRANTs, RLS, staff-only policies, audit + archive triggers matching `meal_text_sends`. Seed the Indonesian and African prices via data inserts.
- `src/lib/meal-text-defaults.ts`: extend `MealRestaurant` with venmo/zelle/price fields, add `DEFAULT_ZELLE_UPDATE_TEMPLATE`, and store its override under `app_settings.key = 'meal_zelle_text_template'`.
- `src/lib/meal-text-message.ts`: build `payment_options` / `zelle_line` / `venmo_line` / `online_prices` from the restaurant row and add them to `renderMealTemplate`.
- `src/lib/meal-texts.functions.ts` and `src/lib/committee-meal-texts.server.ts`: select the new restaurant columns, return `zelleSentAt` per row from `meal_zelle_text_sends`, add `markZelleTextSent` (same single-cuisine-per-action validation as `markMealTextSent`), and allow saving the second template.
- UI: `src/routes/_authenticated/admin/meal-texts.tsx`, `src/routes/_authenticated/admin/meal-texts-mine.tsx` get the Zelle update tab; `src/routes/_authenticated/admin/restaurants.tsx` gets price fields.
- Verification: read the new rows back from the database, then Playwright at 384x681 on `/admin/meal-texts` and `/admin/meal-texts-mine` — confirm the Zelle update tab lists only already-texted meals, the rendered message contains the right Zelle/Venmo/price lines per cuisine, and checking one guest's cuisine does not mark another.
