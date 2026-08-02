## 2026-08-02 23:20 UTC — Security hardening plan

### What I checked first (read-only)
- Ran a fresh backend security scan: **zero active findings** right now (including dependencies).
- Read the saved security notes: only **two items were ever accepted/ignored** as intentional:
  1. Public read access on content tables: `categories`, `events`, `invitation_content`, `menu_items`, `restaurants` (needed for the public invitation page).
  2. The private `entertainment-videos` storage bucket has no anonymous read policy by design (uploads go through a server function).
- Verified guest data is **not** anonymously readable: `rsvps`, `inviters`, `guest_messages`, `entertainment_submissions` all deny anonymous access, and every table in the app has row-level security on.

So there is no open vulnerability sitting ignored. What *is* loose is defense-in-depth: many tables still hand out broad INSERT/UPDATE/DELETE permission to the anonymous and signed-in roles even though no policy allows those actions. Today that is blocked by row-level security, but one mistaken policy would expose it. That's the real work worth doing.

### What I'll do
1. **Tighten table permissions to match policies.** For every table in the app, audit the actual policies and revoke any permission that no policy uses — especially anonymous INSERT/UPDATE/DELETE on `audit_log`, `deleted_rows_archive`, `invitations`, `cuisine_preorders`, `profiles`, `team_invites`, `page_visits`, `referral_duplicates`, `donations_summary`, `duplicate_flags`, `chat_last_seen`, `category_messages`, `category_assignments`, `orders`, and the email/suppression tables. Public content tables keep anonymous **read only**.
2. **Keep everything working.** All writes that legitimately come from anonymous visitors (RSVP submission, entertainment submission, traffic tracking) already run through server functions with the service role, so removing the direct anonymous write permission does not break them. I'll confirm each write path in code before revoking.
3. **Narrow the two accepted exceptions instead of just accepting them.** Restrict the public content tables to read-only for anonymous and confirm no column in them contains guest names or phone numbers; leave the private video bucket as-is (server-side only) and document why.
4. **Verify end-to-end, not just compile.** After the migration I'll test on the live preview at mobile size: public invitation page loads, a guest RSVP submits and reads back, meal pre-order saves, committee dashboard shows guests, admin guest list and audit log load, volunteer signup works. Then re-run the security scan and dependency scan.
5. **Refresh the security notes** so future scans know which exceptions are intentional and which were tightened.

### Technical notes
- One migration containing `REVOKE`/`GRANT` statements only — no table, column, or data changes, so no submitted guest data is touched, hidden, or overwritten.
- Grants will be derived from the policy list per table (read where a SELECT policy exists, write only where an INSERT/UPDATE/DELETE policy exists), keeping `service_role` full access for server functions.
- No application logic or UI changes are planned; if a revoke breaks a client-side write, the fix is to move that write into an existing server function rather than re-widening the grant.

### One thing to confirm
If you were expecting a specific ignored warning to be fixed (something you saw listed in the Security tab), tell me which one and I'll fold it in — from my side the scanner currently reports nothing outstanding.
