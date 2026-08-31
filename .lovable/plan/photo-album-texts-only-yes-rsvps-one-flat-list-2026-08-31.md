# Photo album texts: only "Yes" RSVPs, one flat list

## What changes

The album texting page currently includes people who never replied and people who said "maybe". Remove all of that. The page lists **only guests whose RSVP is Yes** — in person and Zoom together — as **one single list**, not grouped by committee member.

Verified against the database just now:

- **246 people** with a Yes RSVP (after collapsing duplicate phone numbers so nobody gets two texts)
- 133 in person, 113 Zoom
- 0 of them are missing a phone number

## The page after this change

- One flat, alphabetical list of the 246 Yes guests.
- Each row: name, phone, a small "In person" or "Zoom" tag, Text button, Mark sent / Undo.
- Header counts: total, in person, Zoom, still to text, already texted.
- "Text all" and the editable message template stay exactly as they are.
- Existing "Mark sent" history is preserved — nothing already marked gets reset.

## Technical notes

- `src/lib/album-texts.server.ts`: filter to RSVP `status = 'yes'` only (drop no-reply and maybe), keep phone de-duplication, and return a single `guests` array instead of committee groups.
- `src/routes/_authenticated/admin/album-texts.tsx`: render the flat list and updated header counts; remove the committee grouping headers.
- `src/hooks/use-album-texts.ts`: match the new shape.
- The `/admin` nav badge count follows the same number automatically.

## Verification before I report back

- Run the page's own server code against the live database and confirm it returns exactly 246 / 133 in person / 113 Zoom with zero duplicate phones.
- Confirm no committee grouping remains and no "No reply" or "Maybe" row appears.
- Publish so the live site shows it.
