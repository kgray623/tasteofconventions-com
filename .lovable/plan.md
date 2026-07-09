## Revised plan: restore requested amounts, not assigned quotas

**UTC timestamp:** 2026-07-09 16:38 UTC

### What I confirmed
- Kari Gray currently shows `quota = 0`, `requested_quota = null`.
- The audit trail shows Kari had `quota = 52` before it was wiped, but you clarified the actual approved request was **51**, not 52.
- Shelley & Pat Monaghan currently shows `quota = 0`, `requested_quota = null`.
- The audit trail shows Shelley had `quota = 40` before it was wiped, but it does not show a separate `requested_quota` value.
- Dixie Frahm, Betsaida Ruiz, and Jamy Elker are already restored from the previous step.

### Restore I can do now from your correction
Update Kari Gray to the actual approved requested amount you gave:

| Member | Restore to | Source |
|---|---:|---|
| Kari Gray | 51 | Your correction: “Me, the admin, had 51 requested” |
| Dixie Frahm | 30 | Already restored |
| Betsaida Ruiz | 30 | Already restored |
| Jamy Elker | 5 | Already restored |

### Shelley needs one missing value
You said Shelley had some requested, but you are not sure how many. I will not guess and assign 40 unless you confirm that 40 was Shelley’s approved requested amount.

Please tell me Shelley’s approved requested amount. If you want me to use the wiped pre-existing value as the best available restore evidence, I will restore Shelley to **40**.

### Implementation after approval
1. Update Kari Gray only:
   - `quota = 51`
   - `requested_quota = 51`
2. If you confirm Shelley’s amount, update Shelley to that exact amount in both fields.
3. Do not change Denise, Rhonda, Melissa, Rosa, Andres, Tiana, or anyone else unless you name their requested amount.
4. Read the backend records back after the update and report the exact verified values.