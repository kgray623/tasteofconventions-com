# Committee follow-up notes on unpaid meals

## Goal

Add a committee-visible follow-up note per unpaid meal order on `/admin/unpaid`, so the team can record context like "paying Wednesday 8/26" or "voicemail left 8/23, no answer yet" without ever marking anyone paid or hiding anyone from the unpaid list.

## Notes to add (from 2026-08-23 19:2x UTC conversation)

- Deshon Bradley — "Paying Wednesday 8/26 when his check arrives."
- Tina Santana (Myanmar) — "Burmese restaurant closed 8/23; will call when open."
- Tiana Stoddard — "Voicemail left 8/23, no answer yet."

## Database work

1. Create `public.meal_follow_up_notes`:
   - `id` uuid PK default gen_random_uuid()
   - `preorder_id` uuid not null references cuisine_preorders(id) on delete cascade
   - `cuisine` text not null
   - `invitation_id` uuid references invitations(id) on delete set null
   - `note` text not null (max 500 chars)
   - `created_by` uuid references auth.users(id) on delete set null
   - `created_by_label` text
   - `created_at` timestamptz default now()
   - `updated_at` timestamptz default now()
   - unique (`preorder_id`, `cuisine`)
2. GRANT SELECT, INSERT, UPDATE, DELETE to authenticated and ALL to service_role.
3. Enable RLS with policies:
   - authenticated users with role `admin` or `team` may SELECT all rows
   - authenticated users may INSERT/UPDATE/DELETE only rows where the guest's `inviter_id` matches their own inviter(s), or where they are admin
4. Insert the three initial notes above after the table is live.

## Server functions

1. `listMealFollowUpNotes` (POST, requireSupabaseAuth, admin/team only) returns all notes joined to current unpaid rows so the UI can render them by `preorder_id::cuisine`.
2. `saveMealFollowUpNote` (POST, requireSupabaseAuth, admin/team or owning committee member) upserts a single note row by `preorder_id` + `cuisine`, with `created_by`/`created_by_label` populated from the session profile.

## UI changes

1. On `/admin/unpaid` (`src/routes/_authenticated/admin/unpaid.tsx`), render a note line under each unpaid row when one exists.
2. Add an inline edit affordance per row (pencil icon or small "Note" button) that opens a small textarea + save/cancel.
3. Show `created_by_label` and the date after the note text.
4. Notes are purely presentational; they never change the `isPaidState` filter or the badge count.

## Verification

1. Read back the three seeded notes from the database.
2. Screenshot `/admin/unpaid` at 390x844 showing the notes under the correct guests.
3. Confirm the committee-wide unpaid totals are unchanged by the notes (plates count stays the same before/after).

## Out of scope

- No changes to the paid/unpaid logic, badges, or totals.
- No email or SMS notifications when notes are added.
- No note history/audit beyond the single current note.
