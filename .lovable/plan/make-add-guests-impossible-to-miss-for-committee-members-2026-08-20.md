# Make "Add guests" impossible to miss for committee members

**Prepared: 2026-08-20, 21:00 UTC**

## What is true right now

- Tracey Curtis is correctly set up: she has both `team` and `host` roles, an accepted committee invite, and an inviter record (phone 308-534-1096). Her access is not the problem.
- `/admin/upload` ("Add guests", labeled "Guest list" for committee) is already allowed for committee members, and the committee workspace already has a sticky **Upload guest list** button at the top.
- That button only exists *inside* the committee workspace. The site header shows committee members a single "Steering Committee" link and nothing about adding guests, and it is hidden entirely while already on an `/admin` page. From the invitation page, her RSVP page, or any non-admin screen, there is no visible path named anything like "add contacts".
- `/admin/upload` already has a paste-a-list box and image extraction; the committee workspace does not, so a member must navigate away to submit two names.

## Changes

### 1. Header link on every page
For any signed-in committee member, add a persistent **Add guests** link in the top header, next to their Steering Committee / My RSVP link, visible on `/admin` pages too. It goes straight to the add-guests page in committee view.

### 2. Rename for plain language
Use **Add guests** consistently (header, committee tab, workspace button) instead of the mixed "Guest list" / "Upload guest list" wording, and add one line of helper text under the workspace button: "Paste names and phone numbers, or upload a screenshot."

### 3. Paste-in box right on the committee workspace
Add a compact **Add guests fast** card near the top of the committee workspace: a textarea for lines like `Eileen and Blane Annoye, 402-850-8966`, an in-person / Zoom choice, and a Submit button. It reuses the exact same parsing and guest-add server function the upload page uses — no new write path — and shows each added guest back on success, with a link to the full add-guests page for screenshots and bulk lists.

### 4. Add Eileen and Blane Annoye now
Add them as Tracey Curtis's guests: name "Eileen and Blane Annoye", phone 402-850-8966, in person, credited to her inviter record, through the same guest-add path a committee member uses. Nothing existing is modified or removed.

## Technical notes

- `src/components/site-header.tsx` — add the committee-only "Add guests" link; keep the existing Steering Committee / My RSVP behaviour intact.
- `src/routes/_authenticated/admin.tsx` — tab label only ("Add guests" for committee).
- `src/components/committee-workspace.tsx` — button wording, helper line, and the new paste card.
- New small component for the paste card, calling the existing `guest-add.functions` server function with the same normalization the upload page uses, so referral credit and duplicate detection behave identically.
- No schema change, no changes to meal, payment, or text-tracking logic.

## Verification before calling it done

- Playwright at phone viewport 384×681 signed in as a committee member (non-admin): confirm the header "Add guests" link appears on the home page, the RSVP page, and inside `/admin`, and that it opens the add-guests screen.
- Submit a test line through the new paste card and read the created row back out of the database, then confirm it appears in that member's own guest list with correct referral credit.
- Read back Eileen and Blane Annoye from the database: invitation row, phone normalized to 4028508966, inviter = Mike and Tracey Curtis, in-person attendance, and confirm they show in Tracey's guest list.
- Re-read the committee guest counts before and after to prove nothing else changed.
