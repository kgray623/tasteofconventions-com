Plan to remove email from the app

1. Remove guest email from every visible guest/RSVP screen
- Public RSVP page: remove the email field from invitation details.
- My RSVP page: remove the email field from invitation details.
- Dashboard guest lists: remove email icons/text, delete confirmations that mention email, and edit dialogs that can save email.
- Committee workspace and admin guest/inviter/upload pages: remove remaining email display, filters, duplicate labels, review columns, quick-add fields, and edit fields.

2. Stop collecting email in guest creation/import flows
- New invitation form: phone-only contact input.
- Admin upload/import: ignore CSV/XLSX/vCard/contact-picker/screenshot email values and only keep name, phone, notes, RSVP fields.
- Duplicate detection: use phone and guest-name matching only, not email matching.
- Inserts/updates: always send `guest_email: null` or omit it where safe, so new/edited invitations do not collect email.

3. Remove email from RSVP/auth-related application behavior
- Public RSVP self-registration input: remove guest email from validation and creation.
- Stop sending RSVP confirmation emails after RSVP submission.
- Remove or bypass password-reset/email-auth UI paths that are not part of this phone-only login project, so users are not prompted for email.

4. Remove email from entertainment submissions
- Remove the entertainment submission email field from the form.
- Update the submit server function to accept/store phone-only contact details for new submissions.

5. Preserve data safely
- Do not delete database columns, migrations, or historical rows unless you explicitly ask for data removal.
- Existing stored email values will no longer be displayed or collected through the app.
- Generated backend types and historical migrations may still contain column names internally because they reflect the database history/schema, but the app will stop using them for collection/display.

6. Verification before reporting back
- Search the app source again for visible email labels/inputs/icons and guest email usage.
- Verify the exact public RSVP, My RSVP, dashboard, committee workspace, admin guests, admin upload, and new invitation routes in the preview at the current mobile viewport.
- Confirm a new guest can be created/imported without email and read back with phone/name visible and no email shown.

Timestamp: 2026-07-14 00:00 UTC