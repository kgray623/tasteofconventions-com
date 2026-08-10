# Fix the wrong "Texted" marks — one honest queue, human marks only

2026-08-10 07:1x UTC

## What I found in the database (verified, not guessed)

- The old "original meal message" list holds **53 marks — and 31 of them were never made by a person.** They are labeled `backfill from per-guest mark`, written by an earlier bulk process. Those are the "Texted 8/6/2026" badges in your screenshot (Joshua Eno-Tambe, Steven&Denise Madsen, Abby, Melissa Novotny, and 27 others).
- **Kari Gray has no marks at all** — no original mark, no payment-update mark — even though you were texted. Nothing recorded your own sends, so the row honestly reads "not texted", which is why it looks backwards next to machine-marked rows.
- The payment-update list has only **8 marks, all from real people tapping the check** (three admins/committee, Aug 9). Those are legitimate.
- 75 guest orders exist in total.

So the screen is not miscounting. It is showing machine-invented history from the old campaign next to real history, in a tab that no longer matters.

## What I will do

1. **Delete the 31 machine-written marks** from the original-message history (only rows labeled `backfill from per-guest mark`). The 22 marks a person actually tapped stay. Deleted rows go to the archive, so nothing is lost and it is reviewable in Recently deleted.
2. **Remove the "Original meal message" tab** from Admin → Meal texts and Meal texts · mine. There is one queue: the payment update. That kills the two-vocabulary confusion in the screenshot for good.
3. **Show who marked it and when** on every marked row ("Payment update sent 8/9/2026 by Melissa N."), so a mark can never again be anonymous or unattributable.
4. **Hardwire human-only marks**: the mark write path refuses any bulk/backfill write and stamps the acting user on every row. No process other than a person tapping "Check here after you text" can create a mark.
5. **Record your own sends properly**: after the cleanup, the guests you personally texted can be checked off by you (or I can record a specific list you give me by name). I will not guess who you texted.

## Verification before I call it done

- Read the marks back from the database: 0 rows with a backfill label, count of remaining marks = the number of human taps, and every remaining mark has an acting user.
- Open `/admin/meal-texts` at phone width as admin and confirm: no "Texted 8/6/2026" badges remain, no second tab, every marked row names who marked it.
- Confirm the header count equals the ledger's needs-payment-text number, and paid guests (4 restaurant-confirmed + Melissa Novotny reported) stay visible in the "already paid" line, not in the queue.
- Confirm the same on Meal texts · mine.

## Technical details

- Migration/data change: `DELETE FROM public.meal_text_sends WHERE marked_by_label = 'backfill from per-guest mark'` (archive trigger already captures rows).
- `src/routes/_authenticated/admin/meal-texts.tsx`, `meal-texts-mine.tsx`: drop the `mode`/`isZelle` branch and the two mode buttons; render only the payment-update queue; add marker attribution to the badge.
- `src/lib/meal-texts.functions.ts`, `src/lib/committee-meal-texts.functions.ts`: always set `marked_by` from the authenticated user, reject writes carrying a synthetic label, and return the marker label so the UI can display it.
- No change to the message body, Text button, Copy, payment recording, or the ledger states in `src/lib/meal-communication.ts`.
