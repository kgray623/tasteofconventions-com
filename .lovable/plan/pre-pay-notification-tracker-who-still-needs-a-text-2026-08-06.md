# Pre-pay notification tracker (who still needs a text)

2026-08-06 22:1x UTC

## Where things stand right now (read from the database)

- 73 meal pre-orders exist. **All 73 are linked to a committee member**, and **0 have been marked notified** — nobody has been checked off yet.
- Pending pre-pay texts by committee member today:
  Kari Gray 18, Tina Santana 10, Shelley & Pat Monaghan 9, Angela Waters 8, Tamara Madlock 8, Mysha Woods 6, Betsaida Ruiz 4, Melissa Novotne 3, Janet Blaine 3, Aisha Moore 1, Jacquelyn Spears 1, Jamy Elker 1, Dixie Frahm 1.
- The page that lists each committee member and how many guests/invites they have is **Admin → Committee Guests** (`/admin/inviters`).
- The texting tool is **Admin → Meal texts** (`/admin/meal-texts`), and each committee member has **My meal texts** (`/admin/meal-texts-mine`). Notified status is only set when a human checks "Check here after you text" — that stays exactly as is.

## What I'll add

### 1. A "Pre-pay notifications" tracker card on the Admin Overview
One card that always answers "who hasn't been notified":
- Big number: **X of 73 still need a pre-pay text**.
- Per-committee-member rows: name, invites, pre-orders, notified, **still pending** — sorted with the biggest pending first.
- Each row links straight into the meal-texts list filtered to that committee member's unnotified guests.
- A row for any pre-order not linked to a committee member (currently zero) so nobody can silently fall off the list.

### 2. Notification columns on Committee Guests (`/admin/inviters`)
Each committee member's row gains **Pre-orders / Notified / Pending**, so you can see at a glance who is behind, on mobile too.

### 3. Filter + weekly carry-over on the meal-texts pages
- A **Committee member** filter and an existing "only not texted" toggle on `/admin/meal-texts`, so next week you just open the pending list and keep going from your phone.
- Show the date each person was marked notified, so anything left blank is unmistakably outstanding.

### 4. Download the pending list
A **Download pending list (CSV)** button: name, phone, cuisine, quantity, committee member, notified date. Uses the existing mobile-safe download helper so it works on your phone.

## Guarantees

- No pre-order, guest, or existing notified mark is deleted, hidden, or overwritten.
- "Notified" is still only ever set by an explicit human check after the text — never by opening Messages or by a bulk action.
- The pending list is derived live from the database on every load, so it stays accurate week to week.

## Technical notes

- New server function returns a per-inviter rollup by joining `cuisine_preorders` → `invitations` → `inviters`, counting `meal_text_sent_at IS NULL` as pending; staff-only, same `assertStaff` guard as `getMealTextData`.
- Overview card is a new component rendered in `src/routes/_authenticated/admin/index.tsx`; columns added to `src/routes/_authenticated/admin/inviters.tsx`; filter/CSV added to `src/routes/_authenticated/admin/meal-texts.tsx` using `src/lib/download-file.ts`.
- No schema change and no data migration needed.
- Verification before I report done: read the rollup back from the database, and check the Overview card, Committee Guests columns, and the filtered pending list at 384px width.

## One thing to confirm

You said "volunteers" — this plan tracks **committee members who invited guests** (the Committee Guests list), since that's who owns the pre-pay texting. If you also want the same pending counts broken out by **volunteer sign-up category** (setup, cleanup, etc.), say so and I'll add that view too.
