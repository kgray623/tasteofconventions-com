## Change

Add a single "← Back to dashboard" link in the admin shell that appears on every admin sub-page (anything other than `/admin` itself).

### Where

`src/routes/_authenticated/admin.tsx` — render the link just above `<Outlet />`, only when `path !== "/admin"`. This gives every dashboard tile destination (Guests, Volunteer categories, Committee, Pending invites, RSVPs, Food items, Duplicate flags, Audit log) a consistent way back without editing each page.

### Note on tile clicks

The 7 tiles on `/admin` are already `<Link>` components and do navigate to their respective pages. No change needed to the tiles themselves.

### Not changing

- The tab nav stays.
- Tiles, labels, counts, and destinations stay as-is.
- "Duplicate flags" still links to `/dashboard` (that's the existing target).
