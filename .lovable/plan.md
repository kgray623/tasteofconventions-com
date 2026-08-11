# Put Kari Gray’s mock-text row where it is visible

## Confirmed current state

- Kari Gray’s saved preorder is intact: **808-278-7562**, with **1 African, 1 Indonesian, and 1 Myanmar meal**.
- Paid guests are excluded from the active payment-text rows.
- The recently added test control is a separate generic **Test on yourself** panel above the Meal Texts heading, rather than a Kari Gray row in each cuisine list. That placement does not match the screen or workflow you were using.

## Change

- Show **Kari Gray — mock message to myself** inside each applicable cuisine section: African, Indonesian, and Myanmar.
- Each mock row will show the correct quantity and phone number **808-278-7562** and provide a prominent **Text Kari (mock)** button.
- Build each mock text with the exact same live message renderer, restaurant data, pricing, payment details, and links used for real guests.
- Label the row clearly as a test so it cannot be mistaken for an outstanding guest payment text.
- Do not include the mock rows in pending counts, downloads, sent totals, or committee filters.
- Do not show the “Check here after you text” control on mock rows, and do not write to payment, meal-text-send, or guest records.
- Remove the confusing duplicate generic placement once the cuisine-level mock rows are available.

## Verification

- Sign in as admin on the exact phone viewport **384×681** and open `/admin/meal-texts`.
- Confirm Kari Gray appears once in each of the African, Indonesian, and Myanmar sections with **808-278-7562** and quantity 1.
- Inspect all three generated `sms:` links to confirm they target **8082787562** and contain the full cuisine-specific live message.
- Tap each mock button and confirm the phone’s Messages handoff opens without creating a sent mark.
- Read back `meal_text_sends`, `meal_zelle_text_sends`, and `meal_payments` before and after to prove the mock actions created no records and changed no existing records.
