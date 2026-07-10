I will make the upload control visible and reliable in the top committee/admin header, not only lower inside the workspace.

Plan:
1. Add a prominent orange **Upload guests** link/button in the top header of the committee workspace layout for every committee/team member.
   - It will appear at the top of `/admin` when a committee member logs in.
   - It will also appear for admins previewing committee view.
2. Make the button a direct TanStack `Link` styled as the orange button, instead of relying on nested `Button asChild` behavior, so clicking it reliably navigates to `/admin/upload`.
3. Keep the existing orange buttons inside the committee workspace, but make their labels consistent as **Upload guests** where needed.
4. Verify with the live preview on the same mobile viewport that:
   - logging/landing on committee `/admin` shows the orange button at the top,
   - tapping it navigates to `/admin/upload`,
   - the upload page allows committee/team members to add guests.

Technical details:
- Files to update: `src/routes/_authenticated/admin.tsx` and, if needed for label consistency, `src/components/committee-workspace.tsx`.
- No database changes are needed for this button fix.