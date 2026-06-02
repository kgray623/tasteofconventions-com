## Sort committee lists alphabetically by first name

In `src/routes/_authenticated/admin/inviters.tsx`:

1. **Committee members grid** (~lines 621-627): currently sorts by last name. Change to sort alphabetically by full name (first name) using `a.name.localeCompare(b.name)`.

2. **Steering committee invitations & usage table** (`inviters` array): also sort alphabetically by `name` before rendering, so the quota allocation table matches.

No backend or data-model changes.