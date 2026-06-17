## Fix

Dixie currently has two rows in `inviters`, which is why her dashboard and the committee roster look different from everyone else's:

| id (short) | name | phone | host_id | quota |
|---|---|---|---|---|
| 5a2dfd54… | Dixie Frahm | 14029795214 | _null_ | 0 |
| 428f6f14… | MsDixie L. Frahm | _null_ | f90abc4a… (her auth account) | 20 |

Every other committee member has exactly one row, linked to their auth account, with a phone and a quota. I'll bring Dixie to the same shape:

1. Update row `428f6f14…` (the one linked to her account):
   - `name` → `Dixie Frahm`
   - `phone` → `14029795214`
   - keep `quota = 20` and `host_id` as-is
2. Delete the orphan row `5a2dfd54…` (no `host_id`, `quota = 0`).

No code changes — the committee workspace and admin layout are already correct; the duplicate row was the only thing making Dixie's experience inconsistent. After this, her dashboard, her quota, and how she appears in the roster will match every other committee member.
