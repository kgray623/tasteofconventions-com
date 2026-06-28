## What I actually found in your data

I went into the database and the audit log and traced both names. Here is the truth, with timestamps:

**Jennifer Spears**
- One real record from **May 22** (phone 808‑250‑4081) — the original one you uploaded.
- Three **additional** Jennifer Spears records were created **today** (June 28) at 21:28 and 21:54 with a different phone (402‑477‑03…) — the audit log shows all three were inserted by **Kari Gray** (you), not by anyone else and not by the system.
- You then deleted all three of those between 21:57:00 and 21:57:14. So right now there is exactly **one** Jennifer Spears in the list (the original May 22 one).

So she was never in there "four times because the system added her." Three duplicates were added from your account today and then deleted by you. The reason it *looked* like the system was doing it is that the audit log shows **every change twice** — there are two audit triggers on the invitations table (`audit_invitations` and `trg_audit_invitations_change`) both firing the same function on every insert/update/delete. That makes everything look duplicated even when it isn't.

**Daisy Baker**
- There is one record, but it was typed as **"Deisy Baker"** (D‑e‑i‑s‑y), phone (310) 619‑3331, added June 22.
- The audit log shows **no second insert attempt** for any "Daisy" or "Deisy" Baker. So a second add was either never actually submitted, or it failed silently with no toast.
- Searching the guest list for "Daisy" will never find "Deisy" today, because the list does exact substring matching, not fuzzy matching. That is why "she didn't show up."

Nothing has been lost. But the app is making real duplicates too easy to create and real lookups too hard, and the audit log is doubling every entry. I'm going to fix all three.

## Plan

### 1. Stop the database from double‑logging every change
Migration: drop the redundant `trg_audit_invitations_change` trigger from `invitations` and from every other table that has both `audit_<table>` and `trg_audit_<table>_change` pointing at `audit_row_change()`. Keep exactly one audit trigger per table. No data is lost — only the duplicate log rows stop being written going forward. (Existing duplicate audit rows stay in place as history.)

### 2. Make it impossible to create a duplicate by phone or email
Migration adds two **partial unique indexes** on `public.invitations`:
- `(event_id, guest_phone_normalized)` where `guest_phone_normalized <> ''`
- `(event_id, guest_email_normalized)` where `guest_email_normalized <> ''`

After this, the database itself rejects a second insert with the same phone or email for the same event — no matter which screen it came from. Today only the spreadsheet upload screen pre‑checks; quick‑add and screenshot import don't, which is exactly how the three duplicate Jennifers got in.

### 3. Make duplicate‑attempt errors loud and human, on every add path
In `src/routes/_authenticated/admin/upload.tsx`, three places insert into `invitations`:
- Quick add (line ~1288)
- Screenshot import (line ~1142)
- Spreadsheet import (line ~1059)

For each, when the insert fails with the new unique‑violation error (Postgres code `23505`), show a clear toast: **"{name} is already on the guest list — not added again."** Today quick add throws a generic error and the screenshot path silently increments a `failed` counter, which is why you never get a real explanation.

Also add a fuzzy‑name pre‑check on quick add: if a guest with ≥0.6 trigram similarity to the typed name already exists for this event (Daisy↔Deisy is well above that), show a one‑tap confirm — **"Looks like 'Deisy Baker' is already on the list. Add anyway?"** — instead of silently creating a near‑duplicate.

### 4. Fix the guest‑list search so spelling variants find each other
In `src/routes/_authenticated/admin/guests.tsx`, change the search filter from plain `.includes(q)` to also match on **normalized names** (strip non‑letters, lowercase) and on **trigram similarity ≥ 0.5** against the typed query. Searching "Daisy" will then surface "Deisy Baker" with a small "(close match)" tag so you can see what it found and why.

### 5. Verification before I tell you it's done
Using Playwright against the live preview, signed in as you (committee member view, then admin view):
1. Quick‑add "Test Dupe" with phone 555‑0100 → succeeds. Quick‑add the same name+phone again → assert the new toast says "already on the guest list," and confirm via the DB that only one row exists.
2. Screenshot import a contact whose phone matches an existing guest → assert the duplicate toast names them and confirm the DB row count did not increase.
3. Search "Daisy" on `/admin/guests` → assert "Deisy Baker" appears in the results with a "close match" tag.
4. Run a `SELECT count(*)` on `audit_log` for a fresh test insert → assert it produced exactly one row, not two.
5. Re‑run the count on `/admin/guests` Confirmed tab → assert the people / RSVP totals you already verified ("52 people across 35 RSVPs") still match.

I will not say this is fixed until all five checks pass on the real preview at the route and viewport you use.

## Technical details (for reference)
- Migration 1 (drop dup triggers): identify all tables where two triggers both call `audit_row_change()` via `pg_trigger`, drop the `trg_audit_*_change` copy.
- Migration 2 (uniqueness): `CREATE UNIQUE INDEX ... ON public.invitations (event_id, guest_phone_normalized) WHERE guest_phone_normalized <> ''` and the email twin. Existing data is already unique on these pairs (I checked), so the index will build cleanly.
- App: import `withTimeout`/error‑code helpers already present; reuse `normalize_name_for_match` / `similarity` via a new tiny RPC for the fuzzy quick‑add check to avoid pulling the whole guest list into the browser.

## Out of scope (not touching)
- Login, session, OAuth, role assignment.
- Counts on the admin dashboard or `/admin/guests` totals — already verified correct.
- The earlier mobile file‑picker fix — already verified working.
- Any audit‑log history rewrite. Past doubled rows stay as history; only new rows stop doubling.
