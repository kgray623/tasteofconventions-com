## What's actually in the database

Phone `(402) 312-3088` **does exist** — it's on guest **"Mysha Woods"** (spelled without the "i"), correctly linked to committee member **Tina Santana**, event Aug 30 2026, phone normalized to `4023123088`.

A direct DB test of the exact query the search runs finds the row. So the record isn't missing — the search UI is failing to surface it. Two likely reasons, in order of probability:

1. **Name spelling mismatch.** You've been typing "**Myisha** Woods" (with an "i"). The database stores it as "**Mysha** Woods" (no "i"). A name search for "Myisha" will return nothing. Same guest, phone matches your list, just a spelling variant.
2. **Wrong page.** You're currently on the home page (`/`), not `/admin`. The search bar only lives on the admin workspace. Typing on the home page won't hit it.

## Plan

1. **Correct the stored spelling** from `Mysha Woods` → `Myisha Woods` on invitation `53fa9971-…` so future searches for either spelling work. (Phone, host link, and RSVP stay unchanged.)
2. **Verify in the preview** by opening `/admin`, typing `(402) 312-3088` into the search bar, and confirming "Myisha Woods · Added by Tina Santana" appears. Then repeat with the name "Myisha" to confirm the spelling fix took.
3. **Report back** with the DB read-back and a screenshot of the search hit. No other data touched.

If you actually meant a different person or a different number, tell me the correct name and I'll re-check before touching anything.

**Timestamp:** 2026-07-16 UTC