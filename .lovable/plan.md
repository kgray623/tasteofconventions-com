# Permanent AI (Claude) access — admin only

Goal: Claude can reach the admin dashboard any time, using the existing gated AI portal at `/ai-access`, with a key that never expires and doesn't have to be re-entered.

## What changes for you

- `/ai-access` keeps its access key (`AI_ACCESS_SECRET` is already configured) — nothing expires, so the same link keeps working forever.
- The portal shows only the **Admin dashboard** option. The committee and guest test sign-ins are removed from the portal.
- Once the key has been used once in a browser, it is remembered locally, so `/ai-access` works without `?key=` on later visits from that browser.
- The AI admin account is re-created/repaired automatically on each sign-in, so it can never fall out of the roster or lose its admin role.
- The page stays `noindex, nofollow` and is not linked from anywhere in the site.

## Technical scope

1. `src/lib/ai-access.functions.ts`
   - Restrict `RoleInput` / `ROLE_CONFIG` usage to `admin` only (keep committee/guest config code out of the exposed list and reject non-admin roles).
   - `listAiAccessAccounts` returns only the admin account.
   - Keep `ensureRoleAccount` idempotent (already is): auth user, invitation row, `user_roles` admin row.
   - Keep `assertAccessKey` comparing against `AI_ACCESS_SECRET` — no expiry logic added.

2. `src/routes/ai-access.tsx`
   - Read key from `?key=` OR from `localStorage` (`toc.ai_access_key`); persist a valid key after a successful `listAiAccessAccounts` call.
   - Show a single Admin card; drop committee/guest descriptions.
   - Keep the noindex meta and the "Verifying access…" / error states.

3. No database migration, no schema change, no other route touched. `AI_ACCESS_SECRET` stays as-is (rotate on request only).

## Verification

- Load `/ai-access?key=…` in a headless browser: one Admin card renders.
- Click Sign in: session set, redirect lands on `/admin` with admin UI visible.
- Reload `/ai-access` with no `?key=`: still authorized from the remembered key.
- Query `user_roles` to confirm the AI admin account holds exactly one `admin` row.
