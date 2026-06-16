## Goal

Make the admin overview match what you actually count, in your words.

## What changes on the admin page

Replace the three side-by-side cards (All / Guests / Committee) with **one Guests card** that reads, top to bottom:

- **Guests uploaded — 94**
- **SMS sent — 86**
- *(divider)*
- **Confirmed in person — 37** (people, attendance_mode = in_person, status = yes)
- **Confirmed on Zoom — 3** (people, attendance_mode = zoom, status = yes)
- **Total confirmed — 40** (sum of the two above, in people)
- **Declined — 10**
- **Waitlist — N** (single line, people count — only if > 0)
- **Pending — N** (uploaded − responded)
- *(divider)*
- **Food orders — N**
- **Meals ordered — N**

Notes:
- "94 guests" = every invitation on file (guests + committee combined), to match your count.
- One waitlist row only (people count). The duplicate "Waitlist (RSVPs)" line goes away.
- "Yes (RSVPs)" goes away. People counts only for confirmed totals — that's what you care about.
- "Total responses" line goes away (it was the confusing 24/34 number).

## What stays the same

- Reconciliation card (invitations on file, duplicates, orphans, unlinked food orders) — unchanged.
- Operations card — unchanged.
- Reconciliation CSV download — unchanged.
- Underlying data, RSVPs, and preorders — not touched.

## Files

- `src/routes/_authenticated/admin/index.tsx` — collapse 3 cards into 1, rewrite the rows.
- `src/lib/admin-audit.functions.ts` — add `yes_in_person_people` and `yes_zoom_people` to the totals; keep the rest. No new tables, no schema changes.

## Verification

After the change I'll query the DB and confirm the rendered numbers match: 94 / 86 / 37 / 3 / 10.
