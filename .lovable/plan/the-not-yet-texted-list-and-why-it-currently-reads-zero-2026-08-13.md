# The not-yet-texted list — and why it currently reads zero

2026-08-13 02:14 UTC

## What the database actually says right now

I ran the whole event, not just your own guests:

- **69 active meal contacts** (cancellations, declines and Zoom excluded)
- **Every active contact that still owes money has a documented payment-update mark.**
- The only meal lines with **no** mark belong to people who are **already paid**: Angela Waters (African), Gussie Sorensen, Kari Gray (3 meals), Laura Haffke, Melissa Novotny.
- So the "still needs a prepay text" list is **empty today** — 0 people.

That is not the same as "everything is fine". The real discrepancy is the one you have been pointing at:

- The database has marks on **57 contacts dated 2026-08-12** (55 of them still on the active roster).
- You say you physically sent **54**.
- So **up to 3 of today's marks were never actually sent** — and those 3 people are the ones missing your text. The database cannot name them, because a mark was recorded without a human confirmation step behind it.

## What to build so you get a real list

1. **Show the answer plainly at the top of `/admin/meal-texts`**
   - "0 unpaid contacts have no documented text" and, right beside it, "57 marked today vs 54 you report sent — 3 marks unverified".
   - No more silent zero that looks like success.

2. **Give you the 55-name review list to settle the 3**
   - One row per contact marked today: name, phone, cuisines, mark time.
   - Two taps per row: **Yes, I sent this** or **No, I did not send this**.
   - Each decision is appended to the existing evidence ledger with your name and timestamp; nothing is deleted or overwritten.

3. **Turn the "No" answers into the list you asked for**
   - Anyone you mark "not sent" moves immediately into a **Still needs prepay text** list with name, phone, cuisine, quantity, the one-tap SMS button and CSV export.
   - When you have answered 54 yes / 3 no, that list is the authoritative missing list.

4. **Stop the mark-without-a-send problem at the source**
   - A mark may only be written after an explicit "I sent it" confirmation following the SMS handoff — opening Messages records nothing.
   - Paid contacts stay visible as "Paid — no prepay text needed" so they never look like unfinished work.

## Technical details

- Read the roster from the existing canonical meal ledger; derive text state per `preorder_id` + cuisine from `meal_zelle_text_sends` / `meal_text_events` and payment state from `meal_payments` (ignoring cancelled rows).
- Reconciliation decisions go through the existing append-only `meal_text_evidence_reviews` path; add a decision for contacts, not only cuisine lines.
- Keep server-function files as thin authenticated wrappers; calculations live in imported server helpers.

## Verification before I call it done

- Read back from the database: 69 active contacts, 0 unpaid-and-unmarked, 55 active contacts marked today.
- On `/admin/meal-texts` at **384×681** as admin: confirm the 55-row review list renders, mark one contact "not sent", confirm that exact person (and only them) appears on the Still needs prepay text list, then reverse it and confirm the ledger kept both entries.
