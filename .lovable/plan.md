## Plan: Add sorting to the committee “Pending” list

### What will change
1. **Committee page only**
   - Add the sort control inside the committee workspace’s **My Guests Uploaded → Pending** section.
   - This will affect **your pending guests only**: the list is already filtered to the current committee member’s own uploaded guests via `myHostIds` / `host_id`.

2. **Sort options for Pending**
   - Add options:
     - Alphabetical
     - Newest uploaded first
     - Oldest uploaded first
   - Default stays alphabetical unless a different sort is selected.

3. **Use upload date, not RSVP date**
   - Use the invitation upload/created timestamp (`created_at`) for newest/oldest sorting.
   - Update the committee guest data type and fallback browser query so `created_at` is available everywhere this committee list loads.

4. **Keep selection visible and persistent**
   - Store the selected pending sort in the URL, e.g. `/admin?view=committee&pendingSort=newest`, so refresh/back navigation keeps the same order.
   - Preserve existing URL params like `view=committee` and `chat` when changing the sort.

5. **Leave admin-wide guests alone unless you ask otherwise**
   - I will not rely on `/admin/guests`; this fix is for the committee workspace list you actually use.
   - I won’t change RSVP rules, quotas, SMS sending, database schema, or admin exports.

### Technical notes
- File to update: `src/components/committee-workspace.tsx`
  - Add `created_at` to fallback rows.
  - Add `pendingSort` URL search handling with `useSearch` / `useNavigate`.
  - Sort only `myPending` by selected mode.
  - Render a small Select control in the Pending group header.
- File to update: `src/lib/rsvp-totals.functions.ts`
  - Add `created_at` to `CommitteeWorkspaceGuest` and include it in returned rows from `getCommitteeWorkspaceGuests`.
- File to update if required: `src/routes/_authenticated/admin.tsx`
  - Extend the admin layout `validateSearch` to allow `pendingSort` so the URL param is valid on `/admin`.

### Verification
- Sign in as a committee user / committee preview.
- Open `/admin?view=committee` on the mobile viewport the user is using.
- Confirm Pending shows only that committee member’s guests.
- Change Pending sort to Newest, Oldest, Alphabetical.
- Verify the order changes by upload date/name, URL updates, and refresh keeps the selected order.