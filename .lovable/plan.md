Timestamp: 2026-07-14 20:57 UTC

Plan to make sure this does not show up again:

1. Remove the actual guest-facing email surface completely
   - Audit all current admin/committee/RSVP/import routes for any visible email label, input, placeholder, parser hint, CSV column, export field, or validation message.
   - Remove remaining user-facing email wording from upload/import parsing helpers where it could surface in errors or imported contact text.
   - Keep phone/SMS-only behavior intact and do not touch submitted guest data except to hide/remove email from UI paths.

2. Separate transactional infrastructure from guest data
   - Leave only backend/auth transactional email routes/templates if they are required by the platform infrastructure.
   - Confirm none of those routes/components are linked from admin guest upload, RSVP, dashboard, committee, or public guest flows.

3. Verify on the exact route and viewport
   - Check `/admin/upload`, `/dashboard`, committee guest list, RSVP routes, and admin guest list at the mobile viewport the user is using.
   - Inspect the rendered DOM for `email`, `e-mail`, and `mail` labels/inputs/placeholders, not just the source code.
   - Verify there is no email field visible before saying it is fixed.

4. Verify security/dependency status separately
   - Re-run the current security/dependency scan after the package/lockfile update.
   - If the scanner is stale, trigger a fresh scan and only report the fresh result.
   - If a finding still appears, identify whether it is stale scan cache vs. a real remaining dependency path and address the real dependency path.

5. Publish readiness
   - After verification passes, tell you exactly what was checked and whether publishing should pick it up.
   - I will not claim it is done unless the live preview DOM and relevant scan result confirm it.