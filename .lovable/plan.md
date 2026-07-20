## Changes

1. **Remove "Photobooth" volunteer category** from the database (`public.categories`, id `94934e70-8874-4eb7-8392-92fa1841ffae`) via migration. Any category assignments for it will cascade/clear per existing FK rules.

2. **Remove the "Add content" buttons from the public invitation page** (`src/components/invitation-page.tsx`). Currently two `{isAdmin && ...}` blocks render an "Add content" button inside the Food and Volunteer FAQ accordions (lines ~423-429 and ~449). Delete both blocks so nothing renders there for any viewer, including admins. Admins can still edit copy via `/admin/invitation`.

Timestamp on completion: UTC.