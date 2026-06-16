Implement the volunteer chat cards on the Steering Committee member dashboard, not the admin dashboard.

1. Update `CommitteeWorkspace` (`/admin/subcommittee`, shown as the committee member page) to load the signed-in committee member’s volunteer assignments from `category_assignments` joined to `categories`.
2. Add a new dashboard section labeled for the member’s volunteer chats, showing only the categories that the signed-in member has personally volunteered for.
3. Reuse the existing `CategoryChat` modal for each card’s “Open chat” action, with `canChat={true}` because the card only appears for assignments the member has joined.
4. Reuse `useChatUnread()` so each volunteer chat card can show an unread count when there are new messages in that specific category.
5. Add live refresh for `category_assignments` changes for the current user so a chat appears after they volunteer and disappears after they withdraw.
6. If they have not volunteered for anything yet, show a simple empty state telling them to go to Volunteer to choose an opportunity.
7. Do not add this to `/admin` or the admin-only dashboard; admins only see it if they intentionally view the Steering Committee page as a committee member.

Technical notes:
- No schema changes.
- No new chat system.
- No changes to the volunteer page’s existing signup/chat behavior.
- Reuse existing profile lookup naming logic for chat message authors.