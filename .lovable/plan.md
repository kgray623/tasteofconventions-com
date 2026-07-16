## Goal
Ship `taste-of-conventions-replication-guide_v3.pdf` — a single, complete replication guide that opens with a working AI Access section, followed by the full technical brief updated with everything an agent needs to sign in, navigate each dashboard, and rebuild the project.

## Contents (in order)

1. **AI Access Portal (page 1)**
   - Portal URL, one-click sign-in explanation
   - Test-account table (Admin / Committee / Guest — phone, last name, landing route)
   - Manual `/login` fallback (phone + last name only, no password/OTP)
   - "Test accounts — do not share publicly" warning

2. **Live URLs & role dashboards**
   - Production, preview, custom domain
   - Admin dashboard route map (/admin + every subroute: guests, inviters, categories, team, audit-log, recently-deleted, donations, preorders, restaurants, upload, committee-message, chat, event, invitation, backups, subcommittee, my-rsvp, my-volunteer-chats)
   - Committee view of /admin, Guest /my-rsvp, public /, /rsvp, /restaurants, /preorder, /share
   - Step-by-step "what each role does after sign-in"

3. **Project identity & event facts** (brand, date Aug 30 2026, venue, phone-only SMS rule, no-email rule)

4. **Tech stack** (TanStack Start v1, React 19, Vite 7, Tailwind v4, Lovable Cloud/Supabase, createServerFn, no Edge Functions for app logic)

5. **Repo layout** (routes, components, hooks, lib, integrations)

6. **Data model & RLS** (tables, key relationships, GRANT pattern, has_role, user_roles enum)

7. **Auth model** (phone-only sign-in via signInWithPhoneOnly, ensure_committee_team_role, role routing)

8. **Server functions inventory** (auth-phone, invitations, rsvp-totals, guest-search, entertainment-*, admin-audit, team, ai-access, email/*)

9. **Email infra** (notify.cellibratehealth.com sender, templates registry, queue processor, suppression, webhook)

10. **Critical conventions & out-of-scope** (no 7-day expiry, no password field, no email collection, no Edge Functions, waitlist only at 550 in-person cap)

11. **Rebuild checklist** (migrations first, seed inviters/categories/invitation_content, verify on 384×672 viewport)

## Process
- Generate with reportlab (Platypus, Letter, DejaVu Sans registered for any non-ASCII).
- Convert every page to JPEG (`pdftoppm -r 100`) and inspect all pages for clipping, overflow, blank pages, table misalignment, broken links before delivering.
- Fix and re-render until a full pass shows no issues; report QA findings in the reply.
- Write to `/mnt/documents/taste-of-conventions-replication-guide_v3.pdf` and deliver via `<presentation-artifact>`.

No app code changes.

Timestamp: 2026-07-16 02:48 UTC