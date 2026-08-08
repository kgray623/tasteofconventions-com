# Add the Zelle update paragraph to the top of the catered-meal texts

Plan written 2026-08-08 03:0x UTC.

## What changes

Both catered-meal text templates gain this exact wording as the opening block, before the "Hi {first_name}" greeting stays intact — the new text goes above the rest of the message body:

```text
UPDATE REGARDING Your Catered Meal. The restaurants have given us a virtual pre-pay option for our catered meals through the secure option of Zelle. One offers Venmo too.

Thank you for your understanding as this is a first for all of us.
```

- **Main meal text** (first text a guest receives): new paragraph at the very top, then the existing greeting and full message unchanged.
- **Zelle update text** (follow-up to already-texted guests): same paragraph at the very top, then the existing message unchanged.

Nothing else about the wording, payment options, prices, photo links, or the separate texted / Zelle-update checkmarks changes. Both templates remain editable on Admin → Meal texts, so you can reword or remove this block yourself later.

## Technical detail

- `src/lib/meal-text-defaults.ts`: prepend the paragraph to `DEFAULT_MEAL_TEXT_TEMPLATE` and `DEFAULT_ZELLE_UPDATE_TEMPLATE`.
- Saved overrides in `app_settings` (`meal_text_template`, `meal_zelle_text_template`) take precedence over the defaults; if either has been edited and saved before, update that stored value too so the live text shows the new opening.
- Verification: read the `app_settings` rows back, then Playwright at 384x681 on `/admin/meal-texts` and `/admin/meal-texts-mine` to confirm the previewed message for each cuisine starts with the new paragraph and that the rest of the message (order, payment options, prices, photo link) is unchanged.
