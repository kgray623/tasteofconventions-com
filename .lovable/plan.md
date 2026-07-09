## Plan: identify and restore remaining requested quotas

**UTC timestamp:** 2026-07-09 16:45 UTC

### What the research found
I checked:
- Current `inviters` records.
- Every audit entry where `requested_quota`, `quota_requested_at`, or `quota_request_note` appeared.
- Every nonzero quota that was wiped to 0.
- The app code path that submits quota requests.

### Already restored request rows
These are already restored and verified in the backend:

| Member | Current quota | Current requested_quota | Evidence |
|---|---:|---:|---|
| Kari Gray | 51 | 51 | User correction: admin requested 51 |
| Dixie Frahm | 30 | 30 | Request/approval trail: requested 20, later raised/approved to 30 |
| Betsaida Ruiz | 30 | 30 | Approval trail from Kari to 30 before wipe |
| Jamy Elker | 5 | 5 | Explicit `requested_quota = 5` trail |

### Remaining candidate to restore
The only additional member you named whose prior value was wiped is:

| Member | Current quota | Current requested_quota | Prior wiped value | Evidence status |
|---|---:|---:|---:|---|
| Shelley & Pat Monaghan | 0 | null | 40 | No explicit `requested_quota` trail, but prior quota was 40 before wipe and you stated Shelley had requested |

### Not restoring unless you provide a requested amount
These had quotas wiped, but I found no request field, request timestamp, note, named actor request, or user correction for them:

- Andres Gutiérrez — wiped from 40
- Denise Madsen — wiped from 40
- Kenda Andersen — wiped from 40
- Melissa Novotne — wiped from 25
- Rhonda Wilcher — wiped from 40
- Rosa Gutiérrez — wiped from 40
- Tiana Stoddard — wiped from 40

### Implementation after approval
1. Restore Shelley & Pat Monaghan using the only stored prior amount available:
   - `quota = 40`
   - `requested_quota = 40`
2. Leave all other zero/null rows unchanged unless you name their exact requested amounts.
3. Read back all restored/request rows and all wiped-but-not-restored rows from the backend.
4. Report the verified list with exact values.