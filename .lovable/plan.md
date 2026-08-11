# Test the meal payment text on yourself — one per cuisine

You are not missing from the system. Your pre-order is intact (Kari Gray, 808-278-7562, African 1, Indonesian 1, Myanmar 1), but all three are recorded as paid, and paid meals are shown in the queue as "Already paid — no text needed" with no Text button. That is why there is nothing for you to tap.

Rather than un-paying your records (they are locked on purpose, and un-paying them would corrupt the payment history), add a safe way to text yourself the real message for each cuisine.

## What you'll get

A new panel at the top of the Meal payment texts page: **Test on yourself**.

- One row per cuisine — African, Indonesian, Myanmar — using the same message builder the live queue uses, with your name, your quantity, that restaurant's prices, Zelle name/phone, and pay link.
- Each row shows the full message text exactly as a guest would receive it, so you can read it before sending.
- A **Text myself** button per cuisine that opens Messages pre-filled to your own number with that exact message.
- Sending a test never records anything: no "payment update sent" mark, no payment row, no change to any guest record, and it never appears in anyone's activity or counts.
- Clearly labeled as a test panel, visible to admins only.

Also: paid meals in the queue get a **Preview message** link (read-only) so you can inspect any guest's exact text without sending or marking anything.

## Technical notes

- New component `src/components/meal-text-self-test.tsx`, rendered at the top of `src/routes/_authenticated/admin/meal-texts.tsx`.
- Reuses the existing template renderer in `src/lib/meal-text-message.ts` plus the restaurant records already loaded by `getMealTextData`, so the test text is byte-identical to the live one — no second copy of the wording.
- Recipient is the signed-in admin's own phone, read from the existing profile/invitation lookup; falls back to a manually typed number if none is on file.
- Uses the existing `sms-text-button` link behavior (native Messages), but with the "mark as sent" callback omitted, so no `meal_zelle_text_sends` or `meal_text_sends` row is written.
- No database migration, no schema change, no data change.

## Verification before I report back

- Signed in as admin at 384x681 on `/admin/meal-texts`, confirm three cuisine rows appear with your name and quantity 1 each.
- Confirm each rendered message matches the current live wording for that restaurant (prices, Zelle name/phone, pay link).
- Confirm the `sms:` links target your own number and carry the full body.
- Re-read the database after tapping to confirm zero new rows in `meal_text_sends`, `meal_zelle_text_sends`, and `meal_payments`.
