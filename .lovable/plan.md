Make every notification-bell item open the exact chat the user needs.

1. In the notification dropdown, category chat items currently point to `/admin/categories`. Change them to link to the committee dashboard (`/admin/subcommittee`) with a search param like `?chat=<category_id>` so the link lands on the page where that member's chats live.
2. On the committee dashboard, read that search param on mount. If a `chat` id is present and the user has that category in their "My volunteer chats" list, auto-open that category's `CategoryChat` modal and scroll the "My volunteer chats" card into view so it's obvious where they are.
3. If the user has the param but isn't signed up for that category (e.g. an admin opening someone else's chat link, or a stale link), fall back to scrolling to the section without opening a modal.
4. Keep the Committee chat notification item pointing at `/admin/chat` (it already deep-links correctly).
5. After opening a chat from a notification, clear the `chat` param from the URL so refreshing/back doesn't keep reopening it.

Technical notes:
- Add `validateSearch` on `/admin/subcommittee` route for an optional `chat` string.
- `CommitteeWorkspace` already controls `openChatId` state and renders one `CategoryChat` per assigned category — wire the param into that state.
- Use a ref on the "My volunteer chats" card for `scrollIntoView`.
- No schema, RLS, or chat data changes.