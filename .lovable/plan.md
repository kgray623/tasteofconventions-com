# Permanently repair shared-album comments

## Confirmed current state

- Kari’s newest comment, **“Love your enthusiasm 😘”**, is retained in the database with Kari’s account ID, the name **Kari Gray**, its photo link, and timestamp **2026-09-02 12:30:48 UTC**.
- The database currently retains **11 comments total**: Kari’s 3 comments and 8 comments from four other signed-in people. Every comment still points to an existing album item, and every stored commenter name matches that person’s current profile name.
- No comment deletion appears in the deletion archive or comment audit history.
- The guest album reads comments in `src/components/shared-photo-album.tsx`, while both the feed and full-screen viewer render the shared `PhotoComments` component. The current post flow inserts the row and then depends on a second full engagement query to make the new comment visible.
- Two database triggers currently enforce comment/like author names. They agree today, but the duplicated enforcement should be reduced to one authoritative implementation.

## Work plan

1. **Preserve and reconcile every existing comment**
   - Snapshot/read back all 11 existing comment IDs, text, authors, photo IDs, and timestamps before any change.
   - Do not delete, replace, rename, or overwrite submitted comment text.
   - Reconcile every existing row against its author profile and keep all comments visible on their associated photos.
   - If any additional historical source is discovered during implementation, restore it additively and report the exact recovered rows; do not guess missing text or ownership.

2. **Make a successful post appear immediately and remain visible**
   - Change the insert to return the committed database row and merge that exact row into album state immediately, rather than making visibility depend solely on a follow-up query.
   - Keep a database refresh as reconciliation so the feed and full-screen viewer converge on the same authoritative list without duplicates.
   - Surface read/refresh failures to the user instead of silently replacing comments with an empty list.
   - Prevent stale or overlapping refreshes from hiding a newly committed comment.

3. **Keep comments synchronized across album entry points**
   - Ensure feed cards and the full-screen viewer receive the same comment state after posting, closing/reopening, or navigating between photos.
   - Add live synchronization for comment inserts/updates/deletes so another authorized viewer’s retained comments appear without requiring a hard reload.
   - Clean up subscriptions on unmount and deduplicate rows by comment ID.

4. **Consolidate permanent author enforcement**
   - Retain one database-level trigger that always derives `commenter_name` from the authenticated row owner’s profile.
   - Remove only the redundant trigger/function after proving the retained trigger handles future inserts and updates correctly.
   - Keep existing row ownership, text, timestamps, permissions, and all like behavior intact.

5. **Regression coverage and exact verification**
   - Add tests for immediate insertion, reconciliation, deduplication, refresh failure, and feed/viewer consistency.
   - Verify database read-back before and after: all 11 current comments remain present with unchanged IDs/text/photo links, plus any new verification comment.
   - As Kari/admin, use the actual guest-facing RSVP album route on a mobile viewport to post a uniquely identifiable temporary comment, verify it immediately in the same photo, in the full-screen viewer, after reload, and from a second album entry point.
   - Verify one existing comment from every other author remains visible on the correct photo.
   - Remove only the explicitly labeled temporary verification comment after confirming its lifecycle; do not remove any submitted user content.

## Completion standard

The work will only be reported complete after the exact guest route, mobile viewport, Kari/admin role, database write/read-back, feed rendering, viewer rendering, reload behavior, and other users’ retained comments are all verified end to end. If authenticated preview verification is unavailable, that limitation will be reported rather than calling the issue fixed.

**Plan prepared: 2026-09-02 12:32 UTC**
