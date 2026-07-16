## Goal
Give any AI agent working links + credentials to sign in as each of the three roles (admin, committee, guest) and reach their dashboards on the live site.

## Dashboard URLs (already exist)
- Admin: https://www.tasteofconventions.com/admin
- Committee: https://www.tasteofconventions.com/dashboard (committee view)
- Guest: https://www.tasteofconventions.com/dashboard (guest view)
- Sign-in page (phone-only): https://www.tasteofconventions.com/login

All three dashboards are behind `_authenticated`, so an AI must sign in at `/login` first. Sign-in uses phone number only (per project rule) — the phone IS the credential; whoever holds the phone number can sign in.

## What I'll build

1. **Seed three AI test accounts** in a new migration:
   - Admin AI — phone `+15550000001`, name "AI Admin"
   - Committee AI — phone `+15550000002`, name "AI Committee"
   - Guest AI — phone `+15550000003`, name "AI Guest"

   For each: create the `auth.users` row, add matching `invitations` row (with `is_committee=true` for the committee one), and insert the correct `user_roles` entry (`admin` for admin AI; guest/committee derived from invitations).

2. **AI quick-access page** at `/ai-access` (public, noindex):
   - Lists the three role links with the seeded phone numbers.
   - One-click "Sign in as {role}" buttons that call the existing `signInWithPhoneOnly` server fn with the seeded phone, then redirect to the correct dashboard.
   - Clearly labeled "TEST ACCOUNTS — do not share publicly".

3. **Document the URLs** in the reply so any AI can log in with just:
   - URL: /ai-access (or /login + phone)
   - Phone numbers above

## Confirm before I build
1. **OK to seed the three `+15550000xxx` phones as permanent test accounts?** (They'll be real rows in `invitations` / `auth.users` / `user_roles`.) If you prefer different phone numbers, tell me which.
2. **Should `/ai-access` be publicly reachable** (anyone with the URL can one-click sign in as admin), or **gated behind a shared passcode** you set? Public = easiest for AI; passcode = safer.

Timestamp: 2026-07-16 02:35 UTC
