---
name: Auth and audit model
description: Phone + name two-factor login, server-side recovery, and audit log
type: feature
---
Login requires BOTH mobile phone AND the name as it appears on the invitation. Both must match a record in invitations / inviters / team_invites (last-name or first-name token match, case + punctuation insensitive). Server fn `signInWithPhoneOnly` in `src/lib/auth-phone.functions.ts` enforces this and records every attempt (success and failure) to `audit_log` with phone, name, IP (x-forwarded-for / cf-connecting-ip), and user-agent. `recoverPhoneLoginFromCookie` also now requires `name` (stored in localStorage as `taste-of-conventions:last-login-name`), so silent recovery needs both the httpOnly phone cookie AND the name in device storage.

Audit log table: `public.audit_log` (admin-only SELECT via has_role). Auto-populated by trigger `audit_row_change` on: rsvps, team_messages, category_messages, invitations, user_roles, category_assignments, inviters, team_invites, guest_messages, cuisine_preorders, entertainment_submissions. Trigger captures auth.uid(), user phone/name, action (INSERT/UPDATE/DELETE + table), full old/new row in metadata, plus IP/UA from PostgREST request headers when available. Admin view at `/admin/audit-log`.

Do NOT remove the name field from /login or weaken the audit triggers — user requirement.
