Timestamp: 2026-07-20 UTC

## 1. "Invited by" → plain text box (no roster reveal)

Currently `src/routes/rsvp.index.tsx` and `src/routes/rsvp.$token.tsx` render `<CommitteePicker />`, which lists every committee member and guest in the database. The guest types a name and picks — but the list itself exposes everyone.

Change: replace both `<CommitteePicker ... />` usages with a plain `<Input />` bound to `invitedBy` / `setInvitedBy`. No dropdown, no roster fetch, no suggestions. The guest simply types the name of the person who invited them. Server submit path (`invited_by` string) is unchanged.

Remove the now-unused `CommitteePicker` import from both files. Leave `src/components/committee-picker.tsx` and `getCommitteeRoster` in place (still used elsewhere for admin/team screens) — no server changes.

## 2. Ungate cuisine pre-order cards

On `src/routes/rsvp.index.tsx` the cuisine cards are wrapped with `opacity-60` and each Yes/No/+/− button is `disabled` until name + phone are filled (the `canChooseMeals` flag). That's what's graying them out.

Change:
- Remove the `opacity-60` class from the cuisine card wrapper so photos, note, and buttons render at full contrast.
- Remove the `disabled={!canChooseMeals}` from the Yes/No/+/− buttons and let `setQty` update counts directly.
- Keep the small "Enter your full name and mobile number above before choosing meals" hint, but only enforce name+phone at the final Submit step (existing `handleSave` already validates).
- Order is already Myanmar/Burmese (with "Photos coming next week") → African (photos) → Indonesian (photos). No change to labels or photo lists.

Only `rsvp.index.tsx` has this gating; `rsvp.$token.tsx` and `my-rsvp-content.tsx` don't need changes for this item.

## 3. Remove three more volunteer roles

Delete these rows from `public.categories` (same pattern as the earlier cleanup migration):
- Video Projector
- Video Equipment
- Graphic Artist

Match by case-insensitive name; if a category has assignments, keep the row and just hide it — but per your earlier removals we hard-deleted. I'll hard-delete unless you say otherwise.

## Out of scope
No changes to invitation page copy, security policies, RSVP math, or any other screens.
