## What you want

When you (an admin) switch the Overview to "Committee" view, the page — and every sub-page you click into from that view — should look and behave exactly like it does for an actual committee member. No admin cards mixed in, no admin-only buttons, no "Previewing as Committee" banner cluttering things up. Tabs at the top let you jump back to Admin at any time (and to Guest, which already opens a real guest RSVP page).

## Fix

### 1. Persistent Admin / Committee / Guest tabs on `/admin`

Replace the "Preview dashboards" card at the top of `/admin` with a single tab strip visible only to actual admins:

- **Admin** (default) — the full admin overview.
- **Committee** — full committee workspace, nothing else.
- **Guest** — opens a real guest's RSVP page in a new tab (same as today).

Clicking Committee sets `?view=committee` in the URL (not just local state), so navigating into any sub-page keeps you in committee mode. Clicking Admin clears it. The tab strip stays visible on `/admin` so switching back is one click.

### 2. Committee view = committee-only, no admin chrome

- Remove the yellow "Previewing as Committee — Back to Admin Dashboard" sticky banner inside `CommitteeWorkspace`. The tab strip already tells you which mode you're in and provides the back path.
- `CommitteeWorkspace` renders unchanged otherwise — same sections, same buttons a committee member sees.

### 3. Sub-pages behave as committee when `?view=committee` is set

The layout already computes `previewCommittee = isActualAdmin && view === "committee"` and passes `view=committee` through nav links. I'll audit every admin sub-page and make sure that when `previewCommittee` is true, every admin-only control (bulk delete, admin-only filters, "assign role", "view as admin", raw exports, etc.) is hidden and every action is scoped to what a committee member can actually do. Concretely I'll check and fix as needed:

- `/admin/upload` (Add guests / Guest list)
- `/admin/inviters` (Committee)
- `/admin/categories` (Volunteer)
- `/admin/chat` (Team chat)
- `/admin/my-volunteer-chats`
- `/admin/my-rsvp`
- `/admin/preorders`
- `/admin/subcommittee`
- `/admin/team` (Add committee)

The header tab bar in `admin.tsx` already filters to `team`-flagged tabs when in committee mode; no change there.

### 4. Guest tab

Same as today — opens a sample non-committee invitation's `/rsvp/:token` in a new tab. If no guest invitation exists yet, the tab is disabled with a tooltip.

## Out of scope

- No real impersonation / login as another user (would break audit trail). The tabs are a rendering-only preview that mirrors committee behavior.
- No changes to backups, reconciliation CSV, sign-in, or roles.
- No schema changes.

## One clarification

For any admin-only control I find on a sub-page in Committee view, my default is to **hide it entirely** in that mode (not "show it but disable it"). Say the word if you'd rather see it grayed out with a "admin only" tooltip instead.
