## Goal
Add the AI dashboard access info (portal URL + three test accounts) into the existing `taste-of-conventions-replication-guide.pdf` so any AI reviewing the PDF has working sign-in credentials.

## Changes
1. Regenerate `/mnt/documents/taste-of-conventions-replication-guide_v2.pdf` from the current source, adding a new section near the top:
   - **AI Access Portal**: https://www.tasteofconventions.com/ai-access
   - Table of three one-click test accounts:
     | Role | Phone | Last name | Lands on |
     |---|---|---|---|
     | Admin | +1 555-000-0001 | Admin | /admin |
     | Committee | +1 555-000-0002 | Committee | /admin |
     | Guest | +1 555-000-0003 | Guest | /my-rsvp |
   - Manual sign-in fallback via /login (last name + phone)
   - Note: test accounts, do not share publicly
2. Visual QA every page (pdftoppm → inspect images) before delivering.
3. Deliver as `taste-of-conventions-replication-guide_v2.pdf` via `<presentation-artifact>`.

No app code changes. PDF only.

Timestamp: 2026-07-16 02:42 UTC