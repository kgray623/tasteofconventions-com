# Lock down payment-text tracking before Sunday Aug 23

**Live backend reads: August 20, 2026, 20:13 UTC**

## What the database actually says right now

- `meal_text_events`: 212 rows, 79 of them `reversed`, 72 distinct preorders with a `payment_update` "sent" as the latest state.
- Legacy `meal_text_sends` (22 rows) and `meal_zelle_text_sends` (111 rows) are a **strict subset** of `meal_text_events` — 0 legacy rows lack a matching event. So switching every screen to events loses no history, and no backfill *into* events is needed.
- Cindy Garo, Adrianna Marie Gonzalez, Stephanie Williams each have real `payment_update` sent events **and** matching legacy rows for the exact cuisines they ordered (Garo: African 8/11; Gonzalez: Indonesian + Myanmar 8/11; Williams: Myanmar 8/9). Their data is not the problem — a screen's read/filter is.
- Every code path that touches these three tables already goes through the shared resolver (`resolveMealSentMarks`) after the last change: `src/lib/meal-texts.functions.ts`, `src/lib/committee-meal-texts.server.ts`, `src/lib/meal-communication.server.ts`, `src/lib/meal-notify.server.ts`. No file reads a legacy table directly for a yes/no answer any more.
- Two loose ends that can still make a texted guest look untexted:
  - `cuisine_preorders.meal_text_sent_at` — 49 rows carry a value; nothing in the app reads it, but it is a second "sent" flag sitting in the table.
  - 22 events point at a cuisine the preorder no longer contains (order edited after the text). The resolver keys on preorder+cuisine, so those marks silently vanish from the roster — the guest can reappear as "needs text".

Because the code is already consolidated, **I have not confirmed which screen shows those three as NOT SENT.** Step 1 below is to reproduce it on the exact screen rather than guess.

## Plan

### 1. Reproduce first (no code change)
Sign in as admin and as a committee member and load `/admin/meal-texts`, `/admin/meal-texts-mine`, `/admin/preorders`, and the restaurant portal, checking those three names on each. Capture which route and which role shows NOT SENT, and the payload the server function returned. Fix what the evidence names — nothing else.

### 2. Canonical table
`meal_text_events` is canonical, permanently:
- append-only, immutable, per-cuisine, models both `sent` and `reversed`, records actor and evidence source.
- `meal_text_sends` and `meal_zelle_text_sends` become read-only legacy: kept for audit, never written, never read for a yes/no answer. Keep the existing mirror write only if it is already there; do not add new ones.
- `cuisine_preorders.meal_text_sent_at` is declared dead: stop writing it, keep the 49 stored values visible in the audit/export view only. Nothing is deleted.

### 3. Close the order-edit hole (the 22 orphan marks)
Show these explicitly instead of dropping them: on `/admin/meal-texts`, add a small "Text sent for a cuisine no longer on the order" note under any affected guest, so a real notification is never invisible. No mark is deleted or rewritten.

### 4. Guard it so it cannot regress
- Extend `src/lib/meal-communication.test.ts` with cases for: legacy row present but event missing, event present but legacy missing, `reversed` after `sent`, mixed-case/alias cuisine ("Burmese" vs "Myanmar"), and an event whose cuisine is no longer ordered.
- Add a repo check that fails if any file outside the resolver reads `meal_text_sends` / `meal_zelle_text_sends`.

### 5. Verify end-to-end before calling it done
Drive the preview with Playwright as admin and as a committee member: confirm Garo, Gonzalez and Williams read SENT with their real dates on every screen, then re-read the counts from the database and report the exact numbers with a UTC stamp.

## Backfill answer, plainly
No backfill into `meal_text_events` is required — every legacy row already has a matching event. The only data-side work is leaving the legacy tables and the `meal_text_sent_at` column untouched but read-only, and surfacing the 22 orphan marks instead of dropping them.

## Files expected to change
- `src/lib/meal-communication.ts` — orphan-mark reporting from the resolver (additive).
- `src/lib/meal-texts.functions.ts` and/or the screen the reproduction names — surface the orphan note; fix the confirmed read bug.
- `src/routes/_authenticated/admin/meal-texts.tsx` (and `meal-texts-mine.tsx` if implicated) — display only.
- `src/lib/meal-communication.test.ts` — new regression cases.
