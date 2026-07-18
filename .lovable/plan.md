## Goal
Give ChatGPT read-only access to the full codebase + database schema so it can audit for the recurring problems (bad math, duplicates, dropped submissions, auth confusion, RLS gaps).

## Step 1 — Connect the project to GitHub (you do this once)
1. In Lovable, open the **Plus (+)** menu in the chat input (bottom-left) → **GitHub** → **Connect project**.
2. Authorize the Lovable GitHub App.
3. Pick the GitHub account/org and click **Create Repository**.
4. In GitHub, open the new repo → **Settings → Collaborators** → invite ChatGPT's account (or make the repo public if you're okay with that) so ChatGPT can read every file.

Result: ChatGPT gets the live source (routes, server functions, components, migrations under `supabase/migrations/`) and can cite exact `file:line` in its audit.

## Step 2 — I generate a database audit bundle (I do this)
I'll export a single file `/mnt/documents/database-audit-bundle.md` containing, straight from the live DB:
- **Schema** — every table in `public` with columns, types, nullability, defaults, foreign keys, unique constraints, indexes.
- **RLS** — whether RLS is enabled per table + every policy (name, command, roles, USING, WITH CHECK).
- **Grants** — table-level grants to `anon`, `authenticated`, `service_role`.
- **Functions & triggers** — every `public.*` function (with `SECURITY DEFINER` flag + EXECUTE grants) and every trigger.
- **Storage buckets** — public/private + policies.
- **Known-issue notes** — I'll append a short section listing the recurring failure patterns from project memory (people-vs-records math, duplicate identity by phone, dropped RSVPs, admin gates, inviter linkage) so ChatGPT audits *against* the exact problems you keep hitting.

You upload that one file to the ChatGPT conversation alongside the GitHub repo link.

## Step 3 — Prompt for ChatGPT (I'll provide)
I'll give you a ready-to-paste audit prompt that tells ChatGPT:
- Repo URL + which folders to focus on (`src/routes`, `src/lib/*.functions.ts`, `src/components`, `supabase/migrations`).
- The audit checklist: correctness of counts, duplicate detection, RLS coverage, `SECURITY DEFINER` safety, server-vs-client boundary, no-email-collection rule, admin gating.
- Output format: findings table with severity + file:line + suggested fix.

## What I will NOT do
- I won't change any code, schema, RLS, or data.
- I won't share service-role keys or database passwords (not accessible on Lovable Cloud anyway).
- I won't rename or move any existing files.

## Deliverable when you approve
1. `/mnt/documents/database-audit-bundle.md` — the DB audit bundle.
2. A short "How to run the audit in ChatGPT" message with the paste-ready prompt and the exact steps to link the GitHub repo.

You handle the GitHub connect step (Plus menu) since only you can authorize it; everything else I do.
