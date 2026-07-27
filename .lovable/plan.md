## Notifications for newest RSVPs (2026-07-27 UTC)

### Today

The bell in the header only counts unread chat messages (committee chat and volunteer chats). A new RSVP reply produces no notification at all — you have to open the guest list to notice it.

### What gets added

**1. "New RSVPs" in the notification bell**

The bell gains an RSVP section above the chat items:

- **Admin:** every RSVP replied since you last checked — name, Yes/No/Zoom, party size, and how long ago.
- **Committee member:** only replies from their own guests.
- The count rolls into the bell's red badge, so a new reply lights up the bell anywhere in the app.
- Tapping an entry opens the guest list sorted by Latest reply (committee members land on their own guest list) and clears the RSVP count.
- "Mark all read" link in the section header.

**2. "Last seen" tracking**

A per-user timestamp records when RSVP notifications were last viewed, so the count is per person and survives refresh and device changes. This uses the existing chat "last seen" table with a new `rsvp` kind (small migration to allow that value).

**3. Live updates**

The bell re-checks on open, on route change, and every 60 seconds, so a reply that lands while you're on the site shows up without a manual refresh.

**4. NEW badge**

The RSVP notification gets a "NEW" marker in the what's-new registry so it's discoverable for two weeks.

### Technical notes

- New authenticated server function `getNewRsvpNotifications` (in `src/lib/`) returning recent replies scoped by role: admin = all, committee = invitations where they are the inviter/host. Reads `rsvps.responded_at` joined to `invitations`.
- Migration: extend `chat_last_seen.chat_kind` check to include `'rsvp'`; a fixed sentinel `chat_id` is used for the single RSVP feed.
- `src/components/notification-bell.tsx` renders the new section; `src/hooks/use-chat-unread.ts` (or a sibling hook) supplies the RSVP count so the badge total includes it.
- No changes to counting math, guest list contents, or existing chat notifications.

### Verification

- Sign in as admin on mobile (384px), confirm the bell badge includes the recent replies and that the newest name matches a direct database read of `rsvps.responded_at`.
- Tap a notification: confirm it lands on the guest list with that guest at the top and the badge count drops to zero.
- Sign in as a committee member (Tina Santana) and confirm only her own guests' replies appear.
- Refresh and confirm the cleared state persists.
