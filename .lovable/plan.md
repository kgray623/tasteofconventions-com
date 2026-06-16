## What I found in the database

I ran the counts directly against the database:

| Stat | DB truth | Dashboard shows | Verdict |
|---|---|---|---|
| Guest invitations | **94** | 94 | Correct. No deletes happened — `audit_log` shows zero invitation deletions. Daily inserts add up to exactly 94 (most recent: 12 on Jun 14, 3 on Jun 15). The "168" you remember does not match what's ever been in the database. Likely a different screen/metric or it was never 168. |
| Pending invites | **58** | 58 | Correct (94 invitations − 36 RSVPs received). |
| Committee members | **18** | 18 | Correct (dedup of 7 team_invites + 8 committee invitations + 17 active inviters by phone-last-10 or name). |
| Duplicate flags | **5** | 5 | Correct. |
| Volunteer categories | **24** | 24 | Correct value, wrong label ("Categories"). |
| Food items ordered | **30 in DB** | **27** | **Bug.** 3 preorder rows are missing. |

## Bug: "Food items ordered" undercount

The `/preorder` page saves each item as `{ country, qty }`. The admin tile counter only counts items with a `cuisine` field. 3 newer preorders (Jakarta, Mozambique, Indonesia — 1 meal each) get skipped.

This is the same reason the **Admin → Preorders** page labels those 3 rows as "Needs cuisine".

## Changes

1. `src/routes/_authenticated/admin/index.tsx`
   - Relabel "Categories" → "Volunteer categories".
   - In the food-items reducer, accept either `cuisine` or `country` as the item key so all 30 items count. Result becomes 30.

2. `src/routes/_authenticated/admin/preorders.tsx`
   - In the per-item normalizer, fall back to `country` when `cuisine` is missing. The 3 stranded entries roll into their cuisine totals instead of "Needs cuisine".

## Not changing

- Invitations / RSVPs / committee / duplicate flag counts — they match the database.
- The `/preorder` write shape — leaving as `country` to avoid touching guest-facing flow.
- No data migration; the read side becomes tolerant of both keys.
