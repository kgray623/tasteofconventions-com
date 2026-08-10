# Resolve the duplicate guest records

2026-08-10 08:0x UTC

## What the database actually shows

There are 5 flagged pairs (Lupe appears twice because she matches on both name and phone). Read from `invitations`, `rsvps`, `cuisine_preorders`:

| Pair | Confirmed side | Other side |
| --- | --- | --- |
| Joyce Mosley | 402-213-0288, text sent 7/28 | no phone, never texted, no RSVP |
| Lupe Sarske / Lupe Sarski | both same phone 402-706-0077, **neither** has an RSVP | first loaded 7/11 (credited Shelley & Pat Monaghan) vs. re-uploaded 7/17 (credited Dewinica Salis) |
| Dottie & Javan Allen / Dottie Allen | "Dottie & Javan Allen" replied (declined) 8/10 | "Dottie Allen" no RSVP |
| Gisel and Said / Gisel Morga | "Gisel and Said" confirmed yes, party of 2, 1 meal ordered | "Gisel Morga" phone has an extra digit, no RSVP, never texted |
| Ronald Patterson / Veral Patterson | — | **different phone numbers — two real people, not a duplicate** |

## The rule I will apply

Keep the record that carries the real activity: an RSVP reply first, then a meal order, then a sent text, then the first-loaded row. Delete only the side with no reply, no meal, and nothing else attached.

## The decisions

1. **Joyce Mosley** — keep the 402-213-0288 record; remove the phone-less empty duplicate.
2. **Lupe Sarske** — keep the first-loaded 7/11 record (credited to Shelley & Pat Monaghan, per First-Loaded Wins); remove the 7/17 re-upload. If "Sarski" is the correct spelling, tell me and I will correct the name on the kept record instead of switching rows.
3. **Dottie & Javan Allen** — keep this record with its declined reply; remove the empty "Dottie Allen".
4. **Gisel and Said** — keep this confirmed record with its meal order; remove "Gisel Morga" (mistyped phone, nothing attached).
5. **Ronald & Veral Patterson** — no deletion. Both stay; the name-match flag is dismissed as a false match.

Nothing is truly erased: every removed row is archived and stays visible in Admin → Recently deleted.

## Also

Clear the resolved flags from the duplicates panel so it only lists real, unresolved pairs — and leave the Pattersons out of it permanently.

## Verification before I call it done

- Read every remaining `invitations` row for these six names back from the database and confirm one record each (two for the Pattersons).
- Confirm the kept RSVPs are unchanged: Dottie declined, Gisel and Said yes party of 2 with the meal order intact.
- Re-read the RSVP totals and the meal-order count and confirm they only drop by the removed empty rows (no reply, no meal lost).
- Open the duplicates panel and Recently deleted at 384 × 681 as admin and confirm both read correctly.

## Technical details

- Deletions go through the existing archive-and-audit delete path (`admin_delete_rows`), so `deleted_rows_archive` and `audit_log` keep the full record.
- Resolved rows removed from `public.duplicate_flags`; the Patterson pair suppressed so `detect_duplicate_invitations()` does not re-flag two distinct phone numbers on a name match alone.
