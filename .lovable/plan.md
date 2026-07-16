# Restore the Purpose Description + Full Link Map in the Replication PDF

Produce `taste-of-conventions-replication-guide_v4.pdf` in `/mnt/documents/`. Keep every existing section from v3, and add back the detailed platform-purpose description you dictated plus a complete, clickable link map of both the front-end and the back-office so any AI can open each page and see what to replicate.

Timestamp: 2026-07-16 03:55 UTC

## What was missing (and is being restored)

The "purpose of the platform" description you dictated. It gets its own prominent section near the front of the PDF (right after the AI Access Portal), verbatim in intent:

- Purpose: fill a 550-seat event center for "A Taste of Special Conventions" on Sunday, Aug 30, 2026.
- Tracked numbers: guests invited, RSVPs received, total RSVPs per inviter, meal selections per guest, in-person attendance in the building.
- Three restaurant-catered meal options per guest (tracked for catering).
- Attendance modes: in-person OR Zoom. Zoom has no cap — not a concern.
- Waitlist: only activates if in-person hits 550. Currently 400+ seats remain, so waitlist is inactive.
- Guest experience must be seamless: choose in-person vs Zoom, choose a restaurant-catered meal or none.
- Admin invites committee members; committee members invite guests by SMS from their own phones.
- RSVPs are first-come-first-served, linked to the inviter chosen by the guest.
- Login is phone-only (mobile + web). No OTP. No password field in the UI.
- No guest email is ever collected.
- Three access tiers: Admin, Committee, Guest.

## New "Link Map" section — every URL, clickable

Two tables of live links (all as clickable hyperlinks in the PDF) so the AI can open each and see exactly what to replicate.

**Front-end (public + guest):**
- `/` home
- `/rsvp` guest RSVP flow
- `/restaurants` meal browsing
- `/preorder` meal preorder
- `/share` inviter share page
- `/login` phone-only login
- `/ai-access` test-account portal
- `/my-rsvp` guest dashboard

**Back-office (admin + committee):**
- `/admin` dashboard
- `/admin/guests`
- `/admin/inviters`
- `/admin/categories`
- `/admin/team`
- `/admin/audit-log`
- `/admin/donations`
- `/admin/preorders`
- `/admin/restaurants`
- `/admin/upload`
- `/admin/chat`
- `/admin/event`
- `/admin/invitation`
- `/admin/backups`
- `/admin/subcommittee`
- `/admin/my-rsvp`
- `/admin/my-volunteer-chats`

Each link is prefixed with the preview host `https://id-preview--e8411fba-4f86-4ec1-8aae-cc2299e2724a.lovable.app` and the published host `https://tasteofconventions.com` so the AI can hit either environment. AI-access test-account credentials (already on page 1) let it actually load the admin/committee/guest views.

## Everything from v3 stays

AI Access Portal, URLs & role dashboards, project identity, tech stack, repo layout, data model + RLS, auth model, server-functions inventory, email infra, critical conventions, rebuild checklist — unchanged.

## Technical details

- Build with Python `reportlab` (Platypus, Letter, DejaVu Sans font).
- Links rendered with `<link href="...">...</link>` inline markup so they're clickable in the PDF.
- QA: `pdftoppm -r 100` every page → view each JPEG → fix any clipping/overflow/broken link → re-render until clean.
- Output: `/mnt/documents/taste-of-conventions-replication-guide_v4.pdf`, then delivered via `<presentation-artifact>`.
- No app code changes.
