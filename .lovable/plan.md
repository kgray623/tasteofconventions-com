## What's actually there today

The page exists at **Admin → Committee** (`/admin/inviters`). It renders a wide table with columns:

`Name | Requests | Uploaded | In-person | Virtual | Remaining | Status`

The "Uploaded" column is the brought/invited count, and each row has a ▸ chevron that expands to list the actual guest names + RSVP status.

## Why you can't see it on your phone

Two problems on a 384px-wide screen:

1. The table is ~700px wide and scrolls horizontally. On mobile you only see the Name column — every other column (including the brought count and the expand chevron) is off-screen to the right, so it looks like there's nothing there.
2. The count column is labeled "Uploaded", which doesn't read as "guests brought".

## Fix

Edit only `src/routes/_authenticated/admin/inviters.tsx` — presentation only, no data or math changes.

1. **Mobile layout (below `md`)**: replace the wide table with a stacked card per committee member showing:
   - Name (with any pending quota-increase badge kept as-is)
   - Big "Brought: N of Quota" line (the existing `invited` / `i.quota` values)
   - Small line: `In-person N · Virtual N · Remaining N`
   - A "Show guests (N)" toggle that expands the same guest list already rendered in the desktop expanded row (name, contact, RSVP, actions)
   - Status pill + delete button in the card footer
2. **Desktop table (md and up)**: keep as-is, but rename the "Uploaded" column header to "Brought" so it matches the label everywhere else.
3. No changes to counts, queries, roster building, or any other route.

## Verify

Playwright at 384×800, signed in as admin, open `/admin/inviters`: confirm each committee member's card shows a Brought count without horizontal scroll and the "Show guests" toggle reveals their guest names.
