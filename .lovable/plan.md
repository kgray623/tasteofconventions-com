Cleanup of the admin dashboard chrome. Only visual/navigation changes — no data or feature changes.

Remove these:
1. The red "NEW" pill next to the notification bell (top-right header).
2. The "Admin" link in the top-right header when the user is already on an admin page. The big "Admin" page heading covers it.
3. The "Subcommittee" button in the admin header. It duplicates "View as Committee" in the Preview Dashboards card.
4. The "Log out" button in the admin header. The top-right header already has "Log out".
5. The "View as Admin" button in Preview Dashboards. The user is already viewing as admin.

Keep but clarify:
6. "Team access" tab — leave as-is (user said keep it).
7. "Committee chat" vs "Committee message" — these are NOT the same thing:
   - **Committee message** = the tool to compose/send the SMS invitation text to committee members from your phone.
   - **Committee chat** = the internal team chat room where admins and committee members talk to each other in real time.
   To remove the confusion, rename:
   - "Committee message" → "Committee SMS"
   - "Committee chat" → "Team chat"
   (No code change to what each page does — only the tab label and the icon stay the same.)

Files to touch:
- `src/components/site-header.tsx` — remove the `NewBadge` for the bell; hide the "Admin" link when already on `/admin*`.
- `src/routes/_authenticated/admin.tsx` — remove the Subcommittee button and Log out button from the admin header; rename the two tab labels.
- `src/routes/_authenticated/admin/index.tsx` — remove the "View as Admin" button from the Preview Dashboards card.

Validation:
- Open `/admin` and confirm only one "Admin" label, one "Log out", no Subcommittee button, no "View as Admin" button, and no red NEW pill.
- Confirm the two renamed tabs still open the same pages.