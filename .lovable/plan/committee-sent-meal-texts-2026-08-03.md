# Committee-Sent Meal Texts

Goal: instead of you sending 127 texts, each committee member sends the restaurant info to their own guests — one tap per guest, or one tap per cuisine group. You keep the ability to do it on behalf of anyone (Tina).

## What committee members get

A new **My meal texts** page (linked from the committee dashboard and from the Food report).

- Shows only **their own guests** who pre-ordered a meal, grouped by cuisine (Myanmar/Burmese, African, Indonesian).
- Each guest row: name, phone, what they ordered (cuisine + quantity), and a **Text** button that opens their phone's Messages app with the message already filled in.
- Each cuisine group: **Text this whole group** (batched ~20 numbers per message, since phones cap recipients) and **Copy message** for pasting anywhere.
- The message includes the restaurant name, phone number, website, and that guest's order — pulled from the same restaurant records used today (Lalibela, Koen, Burmese).
- **Copy message** button per guest for anyone whose phone blocks the pre-filled SMS link.
- After sending, tap **Mark texted** — the row turns green and drops out of the "still to text" filter. Same sent-status field the admin tool already uses, so you and the committee member never double-text.
- Counter at top: "12 guests · 18 meals · 5 texted · 7 to go".

## What you (admin) get

- On the same page, an **Acting for** picker: choose any committee member and see/send their list exactly as they would. This is how Tina's guests get handled without her touching it.
- Your existing **/admin/meal-texts** page stays as-is for the full 127-person view — nothing removed.
- A **Restaurant sheet** export per cuisine (CSV: guest name, phone, cuisine, quantity) so you can send each restaurant the list of who will be calling and for what event.

## Restaurant info shown to guests

Unchanged and already in the database:
- African — Lalibela Restaurant, (402) 991-5662, lalibelaomaha.com
- Indonesian — Koen Japanese BBQ & Izakaya, (531) 213-2708, koenblackstone.com
- Myanmar/Burmese — (402) 614-8966

The wording is the shared template you already edit on /admin/meal-texts, so changing it there changes what every committee member sends.

## Technical notes

- New server functions in `src/lib/committee-meal-texts.functions.ts` (auth middleware, no admin key for reads that RLS can satisfy):
  - `getMyMealTexts({ actingForInviterId? })` — resolves the caller's `inviters` rows (by `host_id`/phone as the committee workspace already does), joins `cuisine_preorders` → `invitations` on `invitation_id`, filters to invitations whose `inviter_id` is in that set, returns rows + restaurants + template. `actingForInviterId` is accepted only when the caller has the `admin` role.
  - `markMyMealTextSent({ ids, sent })` — same `meal_text_sent_at` field as the admin tool, but verifies each id belongs to the caller's guests (or admin).
- New route `src/routes/_authenticated/admin/meal-texts-mine.tsx`, mobile-first, reusing the group/chunking + `sms:` link builders factored out of `src/routes/_authenticated/admin/meal-texts.tsx` into a shared `src/lib/meal-text-message.ts` (template token substitution, 20-number chunking, clipboard fallback).
- Committee dashboard button added in `src/components/committee-workspace.tsx` next to "Food report".
- CSV export uses the existing `downloadTextFile` + `ExportFallbackDialog` path.
- Verification on a 384-wide viewport with Playwright as a committee identity: guest list scoped correctly, `sms:` href contains the right restaurant + order, mark-texted persists after reload, admin "Acting for Tina Santana" shows Tina's guests only.
