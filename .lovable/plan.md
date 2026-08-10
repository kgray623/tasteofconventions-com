# One honest meal number everywhere

2026-08-10 13:0x UTC

## What the database says right now (read this minute)

| What it is | Number |
| --- | --- |
| Plates ordered (what restaurants cook and get paid for) | **142** — Indonesian 59, Myanmar 49, African 34 |
| Order lines (one household + one cuisine = one text) | 114 |
| Order forms / households who ordered | 75 |
| Orders not linked to a guest record | 0 |

Every quantity in the data is a clean 1, 2, or 3 — there is no bad row inflating anything. So "75" was the household count and "142" is the plate count; both were true, but they were shown with the same word ("meal orders"), which is the actual failure.

**147 is not any number the database currently produces.** The Overview card computes the same 142 from the same rows. The most likely cause is that the Overview screen on your phone still holds a count read before yesterday's duplicate cleanup, because that card has no read timestamp and no refresh. Step 1 below proves or disproves that before anything else changes.

## What I will do

1. **Prove the 147.** Load Admin → Overview as admin at 384×681 and compare the rendered number against a database read taken in the same minute. If it renders 147 with today's data, that is a real computation bug and I fix the computation. If it renders 142, the cause was a stale screen and the fix is the timestamp + refresh below.

2. **One vocabulary, used identically on every screen.** "Meal orders" stops being used as a bare label anywhere. The wording becomes:
   - **Plates ordered — 142** (headline number, as you chose)
   - `75 households · 114 order lines` as the small line underneath
   Applied on Admin → Overview, Admin → Cuisine report, Admin → Meal texts, Admin → Meal texts (mine), and the notification tracker — same words, same order, no screen-specific synonyms.

3. **Every meal number gets a read timestamp and a Refresh.** Each card states "Read from the database HH:MM UTC" so a stale phone screen can never again look like a wrong total.

4. **A single invariant check, shown on Overview.** Plates must equal the sum of the per-cuisine plates, and order lines must equal the number of household+cuisine pairs. If they ever disagree, the card says so in plain words instead of quietly printing a number.

## Verification before I call it done

- Read plates / lines / households straight from the database, then open each of the five screens as admin at 384×681 and confirm every one prints the identical three numbers.
- Confirm the texting queue's own row count equals the 114 order lines minus the paid ones, with no third number appearing anywhere.
- Report the numbers with the UTC time they were read.

## Also

Sarske vs Sarski: I will leave the kept record's spelling exactly as it is. Nothing to decide, nothing lost.

## Technical details

- Single source: `src/lib/meal-communication.ts` / `meal-communication.server.ts` already derive lines and plates; the Overview total moves off `admin-audit.functions.ts`'s separate sum so there is only one code path producing meal counts.
- The invariant check runs server-side in the same read as the totals, so the screen cannot show numbers from two different moments.
