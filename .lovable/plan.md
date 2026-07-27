## What I verified in the database (2026-07-27 UTC)

- **Tina Santana** has an account (`Tina Santana`, phone +1 402-657-7364) and an active inviter record with quota 25, correctly linked to her account.
- **She is NOT marked as committee**: her invitation row has `is_committee = false`, she has no `team` role in `user_roles` (only `host`), and there is no `team_invites` row for her. That is why the committee view does not treat her as a committee member.
- **Her guests exist**: 35 invitations carry her inviter record. 32 of them are hosted by her account; **3 are hosted by Kari Gray** (Jacqueline Graves, Sharon Allison, Juliet Sossou-Etse), so even once she gets in, those 3 would be missing.
- **Root cause of the missing guests in code**: the committee "My uploaded contacts" list filters invitations by `host_id` only (`src/components/committee-workspace.tsx`, `myGuestsUnsorted`). It ignores `inviter_id`, which is the field that actually records who invited the guest.
- **Her RSVP food flag is wrong**: she has a real pre-order (Myanmar, qty 1) but her RSVP row has `ordering_food = false`. One other person has the same mismatch: **Tiana Stoddard**.

## Fix plan

### 1. Make Tina a committee member (data)
Migration:
- Set `is_committee = true` on her invitation.
- Insert `user_roles` row `team` for her account (keep `host`).
- Insert a `team_invites` row (name + phone, role `team`) so she shows on the committee roster like everyone else.

### 2. Show a committee member every guest they invited (code, category fix)
In `src/components/committee-workspace.tsx`:
- Also select `inviter_id` on the invitations query and load the current user's own `inviters` row id(s) (matched by `host_id`, phone tail, or profile name — the same matching already used for host ids).
- Change `myGuestsUnsorted` to include an invitation when **either** `host_id` is one of mine **or** `inviter_id` is one of my inviter ids.
- This fixes the 3 Kari-hosted guests for Tina and the same class of problem for every other committee member whose guests were uploaded by an admin.

### 3. Fix the RSVP "not ordering food" flag (data + forward fix)
Migration:
- Set `ordering_food = true` on the RSVP rows for **Tina Santana** and **Tiana Stoddard**, since both have real pre-orders.
- Add a trigger on `cuisine_preorders` (insert/update) that sets `ordering_food = true` on the matching RSVP whenever a pre-order is saved and linked to an invitation, so new pre-orders can never disagree with the RSVP again.

### 4. Verification before I report done
- Re-query the DB: Tina's `is_committee`, `team` role, guest count by inviter (expect 35), and `ordering_food = true`.
- Load the committee workspace in a browser session and confirm her contact list renders 35 contacts, and confirm her RSVP shows the meal pre-order rather than "not ordering food".

Nothing existing is removed — no guest, RSVP, or pre-order data is deleted or overwritten beyond the two incorrect `ordering_food` flags.
