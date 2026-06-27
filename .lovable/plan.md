You're right. I'm counting RSVP records (35) when you want **people** (party-size totals). Here is what the database actually says right now:

| Bucket | RSVPs | People |
|---|---|---|
| Confirmed — in person | 29 | **46** |
| Confirmed — Zoom | 6 | **6** |
| **Confirmed — total** | 35 | **52** |
| Declined | 14 | 15 |
| Pending | — | 49 (101 − 52) |

The admin dashboard cards (`/admin` → "Confirmed in person / on Zoom / Total confirmed") already sum party size — they should be showing 46, 6, 52. The page that's lying to you is **`/admin/guests`**: its filter tabs count rows (35), not people, so when you tap "Confirmed" you see "35" on the chip even though 52 people are coming.

## Fix

1. **`/admin/guests` tab counts → people, not rows.**
   Change `c[status] += 1` to add `party_size` (default 1 when no RSVP) so the tab chip shows "Confirmed 52", "Declined 15", etc.

2. **Per-row party size is visible.**
   Each guest card already shows "Party of N" for confirmed; extend it to declined/maybe rows too so the math always reconciles.

3. **One-line summary at top of `/admin/guests`.**
   Replace the current "Showing X of 101 total" line with: **"Showing X people across Y guests (of 101 total uploaded)"** — and when a filter is active: **"Confirmed: 52 people across 35 RSVPs (46 in person · 6 Zoom)"**. No more guessing which number means what.

4. **Re-verify `/admin` dashboard.**
   I'll screenshot the live admin dashboard with my admin session and confirm the cards already read 46 / 6 / 52. If anything still shows 35 there, I'll fix it in the same pass.

5. **Verification before I call it done** (per your rule):
   - Load `/admin` as admin → screenshot, OCR the "Confirmed" tiles, confirm 46 / 6 / 52.
   - Load `/admin/guests` → confirm "Confirmed" tab badge reads **52**, "Declined" reads **15**.
   - Click "Confirmed in person" tile on `/admin` → confirm guests page filters to in-person and the count reads **46**.
   - Tap "Confirmed" tab on `/admin/guests` → confirm row list adds up to 52 people across 35 guests.
   - If any single check fails I will not say it's fixed.

## Files I'd touch

- `src/routes/_authenticated/admin/guests.tsx` — change `counts` to sum party size, update the summary line, show party size on every row.

No data changes. No deletions. No RSVP edits. No changes to the audit server function (it's already correct).

## One confirm before I build

When the dashboard tiles say "Confirmed in person: 46", do you want the **number of people** (46) shown big, with "(29 RSVPs)" in small grey below it — or just the people number alone? Same question for the guests-page tabs.
