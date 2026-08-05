# Restaurant portal front door + 100% honest "texted" tracking

Two problems, both fixed in this change. Timestamp of this plan: 2026-08-05 16:35 UTC.

## 1. The restaurant portal is hard to find

It exists at `/restaurant` and restaurants can sign in with their name + their own phone number, but the only way in today is a small link at the bottom of the login page. Nothing on the home page points to it.

What changes:

- Add a clear "Partner restaurant sign-in" entry on the home page (near the existing sign-in area) and in the site header menu, both going to `/restaurant`.
- On `/restaurant`, keep the same rule as everyone else: username = restaurant name, password = the restaurant's phone number. Make the labels say exactly that, and list what they'll see after sign-in (their own orders only).
- The regular `/login` page already forwards restaurant credentials to the portal; that stays.

No change to who can see what: a restaurant still only sees their own cuisine's orders.

## 2. Guests marked "Texted" when nobody texted them

Confirmed in the database: 10 meal pre-orders carry a `meal_text_sent_at` stamp, and 7 of them were stamped in two bulk batches with identical timestamps (3 rows at 2026-08-03 20:37:22, 4 rows at 2026-08-04 22:49:33) — that is a bulk/automatic mark, not one person texting one guest at a time. This is why Tina Santana, Tiana Stoddard and Steven&Denise Madsen show "Texted 8/3/2026" on every cuisine.

Root cause of ongoing false marks: on the committee dashboard and the main dashboard, tapping the "Send text" button **automatically** flips the guest to "Text sent" the moment the link is opened — before you have typed or sent anything. Opening Messages is not sending a text.

What changes:

- Remove auto-marking everywhere. Tapping "Text …" only opens Messages. Nothing is ever recorded as sent by a tap on a link.
- The only way a record becomes "Texted" is the explicit "Check here after you text" checkbox, pressed by a person.
- Because one household row covers all their cuisines, the badge will read "Texted (all their meals)" so it's clear the mark is per household, not per dish.
- Reset the 10 existing `meal_text_sent_at` stamps to "Not texted" so the board starts truthful. Anyone actually texted can be re-checked in one tap. Every reset is written to the audit ledger with a reason, so nothing is lost — the old value stays recoverable.
- Same for guest invitation texts (`invite_sent_at`): the auto-mark-on-tap is removed; existing invite marks are left alone unless you tell me to clear them too.

## 3. Permanent rule saved

Save to project memory: **100% accurate activity tracking. A record may only be marked sent/texted/paid/confirmed by an explicit human action after the act. Never infer or auto-set it from opening a link, rendering a page, or a bulk operation. Every state change is written to the audit ledger and never deleted.**

## Technical detail

- `src/components/committee-workspace.tsx` (~line 1791) and `src/routes/_authenticated/dashboard.tsx` (~line 611): delete the `if (!guest.invite_sent_at) void onSent(guest, true)` side effect on the sms anchor click; keep the checkbox path only. Check `src/routes/_authenticated/admin/upload.tsx` (~line 1961) for the same pattern and remove it.
- `src/routes/_authenticated/admin/meal-texts.tsx` and `meal-texts-mine.tsx`: badge wording only (already no auto-mark).
- Migration: `UPDATE public.cuisine_preorders SET meal_text_sent_at = NULL WHERE meal_text_sent_at IS NOT NULL;` — the existing `audit_row_change()` trigger records the before/after, plus one `audit_log` row explaining the reset.
- `src/routes/index.tsx` + `src/components/site-header.tsx`: restaurant portal link. `src/routes/restaurant.tsx`: label/help copy.
- Verification: Playwright at 384x681 — sign into `/restaurant` as Lalibela with its phone number and confirm the order list renders; on `/admin/meal-texts` tap a "Text" button and read the row back from the database to prove `meal_text_sent_at` is still NULL; then press the checkbox and prove it is set.
