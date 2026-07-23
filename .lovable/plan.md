## What's wrong

The 404 comes from the admin **Dashboard → Guest** preview tab. It opens `/rsvp/${rsvp_token}` with the **raw** token, but RSVP tokens contain `/` characters (verified in DB — sample: `JXx9APgT0COTW4HJGSUDU/dM`). The URL becomes `/rsvp/JXx9APgT0COTW4HJGSUDU/dM`, which the router parses as two path segments and no route matches — so `__root`'s NotFoundComponent renders ("404 — Not on the guest list").

Other surfaces already handle this by encoding tokens as base64url before putting them in the URL (`+`→`-`, `/`→`_`, then `encodeURIComponent`). The server's `rsvpTokenCandidates` already reverses that mapping, so decoding is a no-op change. Two admin surfaces skipped the encoding — those are the bug.

## Fix (two small edits, presentation only)

1. **`src/routes/_authenticated/admin/index.tsx`** — `openAsGuest()` (the Guest preview tab): encode `sampleGuestToken` with the same base64url + URI-encode step used in `dashboard.tsx` / `committee-workspace.tsx` before injecting it into the URL.

2. **`src/routes/_authenticated/admin/guests.tsx`** — the "Open RSVP" `<a href={\`/rsvp/${r.rsvp_token}\`}>` on each guest card: apply the same encoding.

Both use this one-liner, matching what `dashboard.tsx:201` already does:

```ts
const safeToken = encodeURIComponent(t.trim().replace(/\+/g, "-").replace(/\//g, "_"));
```

No server-function, DB, or schema changes — the server already accepts both encoded and raw forms.

## Verify

- Playwright: from `/admin`, click **Guest** tab → confirm the opened tab lands on the RSVP form (not 404).
- Playwright: on `/admin/guests`, tap **Open RSVP** on a guest whose token contains `/` → confirm the RSVP page renders.
- Sanity: pick a token containing `/` from `invitations` and confirm both encoded URL and the original still resolve via `getInvitationByToken` (already covered by `rsvpTokenCandidates`).
