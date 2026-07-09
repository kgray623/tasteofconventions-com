## Plan: restore requested-and-approved quotas only

**UTC timestamp:** 2026-07-09

### What I will restore
Based on the backend audit trail, I will restore only values that show evidence of a user/requested quota or a later approved requested amount, not blanket assigned quotas.

Restore these records:

| Member | Restore to | Why |
|---|---:|---|
| Jamy Elker | 5 | `requested_quota` was 5 and is already restored correctly |
| Dixie Frahm | 30 | Dixie had a request flow recorded at 20, then later approved/raised to 25 and 30 before it was wiped to 0 |
| Betsaida Ruiz | 30 | Kari approved/changed Betsaida from 3 to 30 before it was wiped to 0 |

### What I will not restore unless you name them
I will not restore pure assigned-allocation rows where the audit only shows a preset quota wiped to 0 and no request/approval trail in the available records:

- Shelley & Pat Monaghan — audit only shows 40 wiped to 0; I do not yet see the request event
- Kari Gray — audit only shows 52 wiped to 0
- Rhonda Wilcher — audit only shows 40 wiped to 0
- Melissa Novotne — audit only shows 25 wiped to 0
- Rosa Gutiérrez — audit only shows 40 wiped to 0
- Andres Gutiérrez — audit only shows 40 wiped to 0
- Tiana Stoddard — audit only shows 40 wiped to 0
- Denise Madsen — audit shows an assigned 40 then wiped to 0, and you previously said not to preset Denise

If Shelley did request and the request is not represented in the audit fields I can see, tell me the approved amount and I will include Shelley exactly at that amount.

### Implementation
1. Update only the affected inviter rows:
   - Dixie Frahm: `quota = 30`, `requested_quota = 30`
   - Betsaida Ruiz: `quota = 30`, `requested_quota = 30`
   - Jamy Elker: leave at `quota = 5`, `requested_quota = 5`
2. Do not assign any quotas to anyone else.
3. Read the database back after the update and verify:
   - Dixie, Betsaida, and Jamy show the requested amount in both quota fields.
   - Everyone else listed above remains 0/null unless explicitly added by you.
4. If the admin UI still shows a different number, verify the exact admin route so it displays `requested_quota` as the source of truth where applicable.