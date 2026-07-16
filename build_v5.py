#!/usr/bin/env python3
"""Build taste-of-conventions-replication-guide_v5.pdf"""
import subprocess
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)

# Register Unicode font
font_path = subprocess.check_output(
    ["fc-match", "-f", "%{file}", "DejaVu Sans"], text=True
).strip()
bold_path = subprocess.check_output(
    ["fc-match", "-f", "%{file}", "DejaVu Sans:bold"], text=True
).strip()
pdfmetrics.registerFont(TTFont("DejaVu", font_path))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", bold_path))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold")

styles = getSampleStyleSheet()
for s in styles.byName.values():
    try:
        s.fontName = "DejaVu"
    except Exception:
        pass

BODY = ParagraphStyle("Body", parent=styles["Normal"], fontName="DejaVu",
                     fontSize=9.5, leading=13, spaceAfter=6)
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="DejaVu-Bold",
                    fontSize=16, leading=20, spaceBefore=10, spaceAfter=8,
                    textColor=colors.HexColor("#1a2b4a"))
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="DejaVu-Bold",
                    fontSize=12.5, leading=16, spaceBefore=10, spaceAfter=5,
                    textColor=colors.HexColor("#2a3f6a"))
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8.5, leading=11)
CODE = ParagraphStyle("Code", parent=BODY, fontName="Courier", fontSize=8.5, leading=11,
                      leftIndent=8, backColor=colors.HexColor("#f4f4f7"))
LINK = ParagraphStyle("Link", parent=BODY, fontSize=9, leading=12)

def P(t, s=BODY): return Paragraph(t, s)

PROD = "https://www.tasteofconventions.com"
PREV = "https://id-preview--e8411fba-4f86-4ec1-8aae-cc2299e2724a.lovable.app"

def link(url, text=None):
    return f'<link href="{url}" color="#1e5fbf"><u>{text or url}</u></link>'

story = []

# Title
story.append(P("Taste of Conventions", ParagraphStyle("T", parent=H1, fontSize=20, alignment=1)))
story.append(P("Full Replication Guide — v5 (2026-07-16 UTC)",
               ParagraphStyle("Sub", parent=BODY, alignment=1, fontSize=10, textColor=colors.grey)))
story.append(Spacer(1, 8))
story.append(P("Single-source brief for any AI agent (Claude Code, Cursor, ChatGPT, Lovable) to sign in, "
               "open every dashboard, and rebuild the project end-to-end. Start with the AI Access Portal "
               "(§1) to load the live site as each role, then use the Link Map (§3) to open every "
               "front-end and back-office page and see what to replicate."))

# 1. AI Access Portal
story.append(P("1. AI Access Portal (start here)", H1))
story.append(P(f"Portal URL: {link(PROD + '/ai-access')}"))
story.append(P("Click the &quot;Sign in&quot; button next to any role. The page idempotently provisions the "
               "auth user, invitation row, and user_roles row (if missing), issues a session via a "
               "magiclink → verifyOtp handshake, and redirects to that role's dashboard."))
story.append(P("Test accounts", H2))
tbl = Table([
    ["Role", "Phone", "Last name", "Lands on", "user_roles"],
    ["Admin", "+1 555-000-0001", "Admin", "/admin", "admin"],
    ["Committee", "+1 555-000-0002", "Committee", "/admin", "team"],
    ["Guest", "+1 555-000-0003", "Guest", "/my-rsvp", "(none)"],
], colWidths=[0.9*inch, 1.4*inch, 1.0*inch, 1.2*inch, 0.9*inch])
tbl.setStyle(TableStyle([
    ("FONT", (0,0), (-1,-1), "DejaVu", 9),
    ("FONT", (0,0), (-1,0), "DejaVu-Bold", 9),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2fb")),
    ("GRID", (0,0), (-1,-1), 0.3, colors.grey),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("RIGHTPADDING", (0,0), (-1,-1), 5),
]))
story.append(tbl)
story.append(Spacer(1, 6))
story.append(P("Manual sign-in fallback", H2))
story.append(P(f"Go to {link(PROD + '/login')} and enter the last name + phone above. "
               "Credential rule: <b>username = last name</b>; <b>password = phone number</b>. "
               "The server function <b>signInWithPhoneOnly</b> validates both fields against the allowed "
               "guest/team records, signs in server-side, and returns tokens for <b>supabase.auth.setSession</b>."))
story.append(P("Warning: Test accounts — do not share the portal publicly. Anyone with the numbers above "
               "can sign in as that role.", SMALL))

# 2. Platform Purpose — RESTORED
story.append(P("2. Platform Purpose (why this app exists)", H1))
story.append(P("<b>Fill the venue.</b> This is an SMS-based invitation + RSVP web app for "
               "<b>A Taste of Special Conventions</b> on <b>Sunday, August 30, 2026</b>. The single goal "
               "of the platform is to fill a <b>550-seat event center</b> and give every guest a seamless "
               "experience end-to-end."))
story.append(P("<b>What we track (the numbers that matter):</b>"))
story.append(P("• Number of guests <b>invited</b> (per inviter and in total).<br/>"
               "• Number of <b>RSVPs received</b> (per inviter and in total).<br/>"
               "• Total RSVPs <b>per inviter</b> — attribution back to the committee member who invited them.<br/>"
               "• <b>Meals chosen</b> by each RSVP guest — used to place the catering order.<br/>"
               "• <b>In-person attendance in the building</b> on event day (against the 550 cap)."))
story.append(P("<b>Attendance modes.</b> Every guest may attend <b>in person</b> or on <b>Zoom</b>. "
               "Zoom has no attendee limit — it is not a capacity concern. Only the in-person count "
               "counts against the 550-seat cap."))
story.append(P("<b>Waitlist.</b> The waitlist activates <b>only</b> when in-person RSVPs reach 550. "
               "At the moment there are 400+ seats still available, so the waitlist is inactive. "
               "Inviter quotas <b>do not</b> trigger the waitlist — only the building cap does."))
story.append(P("<b>Catering.</b> Guests choose from <b>three restaurant-catered meal options</b>, or opt "
               "out. Selections roll up in /admin/preorders so caterers can be given exact counts."))
story.append(P("<b>Invitations.</b> The admin invites committee members. Committee members then invite "
               "guests <b>by SMS from their own phones</b> (the app prefills an <b>sms:</b> link — "
               "the platform never sends SMS itself; &quot;Mark as sent&quot; is a manual flag). "
               "RSVPs are <b>first-come, first-served</b> and are linked to the inviter the guest chose."))
story.append(P("<b>Login.</b> On both mobile and web, the <b>username is the guest/team member's last name</b> "
               "and the <b>password is their phone number</b>. Both values must match invitations / inviters / "
               "team_invites records before access is granted."))
story.append(P("<b>No guest email is ever collected.</b> Guest contact is SMS only, always."))
story.append(P("<b>Three access tiers:</b> Admin, Committee, Guest. Each has a distinct dashboard "
               "(§3 Link Map)."))

# 3. Link Map — NEW
story.append(P("3. Link Map — open every page (front-end + back-office)", H1))
story.append(P("Every route is listed twice: production (custom domain) and preview (Lovable). Sign in "
               "via §1 first, then click through to see the live UI to replicate. All links are clickable."))

story.append(P("Environments", H2))
env_tbl = Table([
    [P("<b>Environment</b>", SMALL), P("<b>Base URL</b>", SMALL)],
    [P("Production (custom)", SMALL), P(link(PROD), SMALL)],
    [P("Production (apex)", SMALL), P(link("https://tasteofconventions.com"), SMALL)],
    [P("Published (Lovable)", SMALL), P(link("https://tasteofconventions-com.lovable.app"), SMALL)],
    [P("Preview (Lovable)", SMALL), P(link(PREV), SMALL)],
], colWidths=[1.7*inch, 4.5*inch])
env_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2fb")),
    ("GRID", (0,0), (-1,-1), 0.3, colors.grey),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(env_tbl)
story.append(Spacer(1, 8))

front_routes = [
    ("/", "Invitation landing page (hero, event facts, RSVP CTA)"),
    ("/login", "Username = last name; password = phone number"),
    ("/ai-access", "AI sign-in portal (this doc's §1). noindex."),
    ("/rsvp", "RSVP intake index"),
    ("/my-rsvp", "Guest's own RSVP + preorder view (authenticated)"),
    ("/preorder", "Cuisine pre-order flow (three restaurant meal options)"),
    ("/restaurants", "Restaurant / menu browser"),
    ("/share", "Committee SMS-share helper (opens sms: on device)"),
    ("/auth", "Supabase auth callback landing"),
    ("/reset-password", "Legacy reset flow (kept for compatibility)"),
]

def route_table(routes, header):
    rows = [[Paragraph("<b>Route</b>", SMALL),
             Paragraph("<b>Production</b>", SMALL),
             Paragraph("<b>Preview</b>", SMALL),
             Paragraph("<b>Purpose</b>", SMALL)]]
    for path, purpose in routes:
        rows.append([
            Paragraph(f"<font face='Courier'>{path}</font>", SMALL),
            Paragraph(link(PROD + path, "open"), SMALL),
            Paragraph(link(PREV + path, "open"), SMALL),
            Paragraph(purpose, SMALL),
        ])
    t = Table(rows, colWidths=[1.7*inch, 0.7*inch, 0.7*inch, 3.4*inch], repeatRows=1)
    t.setStyle(TableStyle([
        ("FONT", (0,0), (-1,-1), "DejaVu", 8.5),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2fb")),
        ("GRID", (0,0), (-1,-1), 0.3, colors.grey),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    return t

story.append(P("Front-end (public + guest)", H2))
story.append(route_table(front_routes, "front"))
story.append(Spacer(1, 8))

admin_routes = [
    ("/admin", "Admin home — quick stats, links to every subroute"),
    ("/admin/guests", "Guest list, search, RSVP status, filters"),
    ("/admin/inviters", "Inviter accounts + soft quotas"),
    ("/admin/team", "Committee / team roster, invite team member"),
    ("/admin/subcommittee", "Subcommittee grouping"),
    ("/admin/categories", "Categories + assignments"),
    ("/admin/chat", "Chat moderation across categories"),
    ("/admin/committee-message", "Broadcast SMS-style message to committee"),
    ("/admin/audit-log", "Immutable admin audit trail"),
    ("/admin/recently-deleted", "Soft-deleted archive + restore"),
    ("/admin/donations", "Donations summary"),
    ("/admin/preorders", "Cuisine pre-order rollups (meal counts for caterers)"),
    ("/admin/restaurants", "Restaurants + menus editor"),
    ("/admin/upload", "CSV / XLSX contact import"),
    ("/admin/event", "Event singleton editor (date, venue, times)"),
    ("/admin/invitation", "Invitation content singleton editor"),
    ("/admin/backups", "Data export snapshots"),
    ("/admin/my-rsvp", "Admin's own RSVP view"),
    ("/admin/my-volunteer-chats", "Committee volunteer chat threads"),
]
story.append(P("Back-office (admin + committee)", H2))
story.append(route_table(admin_routes, "admin"))
story.append(Spacer(1, 6))
story.append(P("Admin routes require role <b>admin</b> or <b>team</b>. Committee (team) view hides "
               "admin-only tools (audit-log, backups, recently-deleted, team management, event / "
               "invitation singletons). Route gating is enforced by <b>has_role</b> + <b>useAdminView</b>.",
               SMALL))



# 5. Project Identity
story.append(P("4. Project Identity & Event Facts", H1))
id_tbl = Table([
    ["Field", "Value"],
    ["Brand", "Taste of Conventions"],
    ["Domain", "tasteofconventions.com"],
    ["Event", "A Taste of Special Conventions"],
    ["Date", "Sunday, August 30, 2026"],
    ["Venue", "Eagle's Landing, La Platte, NE"],
    ["Time", "16:00 – 21:30 CT"],
    ["Cap (in-person)", "550 (waitlist triggers only at this cap)"],
    ["Contact channel", "SMS only, from each team member's own phone (sms: link prefilled)"],
    ["Email collection", "Never. Do not collect / display / import / export guest emails."],
    ["Email sender (infra only)", "notify.cellibratehealth.com"],
], colWidths=[1.8*inch, 4.4*inch])
id_tbl.setStyle(TableStyle([
    ("FONT", (0,0), (-1,-1), "DejaVu", 9),
    ("FONT", (0,0), (-1,0), "DejaVu-Bold", 9),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2fb")),
    ("GRID", (0,0), (-1,-1), 0.3, colors.grey),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(id_tbl)

# 6. Tech stack
story.append(P("5. Tech Stack", H1))
for line in [
    "TanStack Start v1 (React 19, Vite 7). File-based routing under src/routes/.",
    "Tailwind CSS v4 via src/styles.css (@theme tokens, no tailwind.config.js).",
    "Lovable Cloud backend (Supabase under the hood — never referenced by name to users).",
    "Server logic: <b>createServerFn</b> from @tanstack/react-start. NOT Supabase Edge Functions for app logic.",
    "Deploy target: Cloudflare Workers (edge) with nodejs_compat.",
    "Auth: Supabase auth with last-name username + phone-number password credential path (custom server fn).",
    "Email: templates in src/lib/email-templates/, sender notify.cellibratehealth.com.",
    "PWA: manifest + service worker (public/sw.js, src/pwa-register.ts).",
]:
    story.append(P("• " + line))

# 7. Repo Layout
story.append(P("6. Repo Layout", H1))
story.append(P("""<font face='Courier' size='8'>src/<br/>
|-- routes/<br/>
|   |-- __root.tsx, index.tsx, login.tsx, ai-access.tsx, my-rsvp.tsx<br/>
|   |-- auth.tsx, reset-password.tsx, preorder.tsx, restaurants.tsx, share.tsx<br/>
|   |-- rsvp.index.tsx, rsvp.$token.tsx<br/>
|   |-- _authenticated.tsx (route gate — redirects to /login)<br/>
|   |-- _authenticated/admin.tsx + admin/*.tsx (19 admin subroutes)<br/>
|   |-- api/public/* (webhooks — signature-verified, auth bypassed)<br/>
|   |-- lovable/email/* (auth webhook, transactional send/preview, queue, suppression)<br/>
|   `-- sitemap.xml.ts, exports.$filename.ts, email/unsubscribe.ts<br/>
|-- components/ (invitation-page, committee-workspace, site-header, CategoryChat, ui/* shadcn)<br/>
|-- hooks/ (use-auth, use-roles, use-admin-view, use-chat-unread, use-mobile)<br/>
|-- lib/ (*.functions.ts server fns + client utils; see §9)<br/>
|-- integrations/supabase/ (client, client.server, auth-middleware, auth-attacher, types — auto-gen)<br/>
`-- router.tsx, server.ts, start.ts, styles.css</font>"""))

# 8. Data model
story.append(P("7. Data Model & RLS", H1))
story.append(P("Core tables (public schema)", H2))
core = [
    ("events", "Event singleton (id 000...001 for the Aug 30 2026 event)"),
    ("invitations", "One row per invited guest. FK host_id → auth.users."),
    ("invitation_content", "Editable copy for the invitation landing page (singleton)"),
    ("inviters", "Committee inviter accounts + soft quotas"),
    ("rsvps", "One row per response. FK invitation_id → invitations."),
    ("categories", "Volunteer / dish categories"),
    ("category_assignments", "Guest ↔ category mapping"),
    ("cuisine_preorders", "Pre-order line items. FK invitation_id → invitations."),
    ("restaurants / menu_items", "Menu browser data"),
    ("donations", "Donations rollup"),
    ("guest_messages / team_messages", "Threaded messaging"),
    ("team_invites", "Pending committee invitations"),
    ("user_roles", "Enum roles: admin, team. Guests have NO row."),
    ("audit_log", "Immutable admin actions"),
    ("recently_deleted", "Soft-delete archive with restore metadata"),
    ("email_queue / suppression / events", "Outbound transactional email pipeline"),
]
rows = [[Paragraph("<b>Table</b>", SMALL), Paragraph("<b>Purpose</b>", SMALL)]]
for t, p in core:
    rows.append([Paragraph(f"<font face='Courier'>{t}</font>", SMALL), Paragraph(p, SMALL)])
tt = Table(rows, colWidths=[2.2*inch, 4.0*inch], repeatRows=1)
tt.setStyle(TableStyle([
    ("FONT", (0,0), (-1,-1), "DejaVu", 8.5),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2fb")),
    ("GRID", (0,0), (-1,-1), 0.3, colors.grey),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(tt)
story.append(Spacer(1, 6))
story.append(P("RLS pattern (every public table)", H2))
story.append(Paragraph("""<font face='Courier' size='8'>GRANT SELECT, INSERT, UPDATE, DELETE ON public.&lt;t&gt; TO authenticated;<br/>
GRANT ALL ON public.&lt;t&gt; TO service_role;<br/>
-- add GRANT SELECT ... TO anon only when a policy permits anon reads<br/>
ALTER TABLE public.&lt;t&gt; ENABLE ROW LEVEL SECURITY;<br/>
CREATE POLICY ... USING ( public.has_role(auth.uid(), 'admin') OR ... );</font>""", CODE))
story.append(P("Role enum &amp; has_role", H2))
story.append(Paragraph("""<font face='Courier' size='8'>CREATE TYPE public.app_role AS ENUM ('admin', 'team');<br/>
CREATE FUNCTION public.has_role(_uid uuid, _role app_role) RETURNS boolean<br/>
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$<br/>
&nbsp;&nbsp;SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = _role);<br/>
$$;</font>""", CODE))
story.append(P("Guest identity = <b>invitations.is_committee=false</b> AND no user_roles row. "
               "Committee identity = <b>invitations.is_committee=true</b> AND user_roles.role='team' "
               "(promoted at sign-in via <b>ensure_committee_team_role</b> RPC)."))

# 9. Auth
story.append(P("8. Auth Model", H1))
for line in [
    "Sign-in surface: <b>/login</b> — <b>username = last name</b>; <b>password = phone number</b>.",
    "Server fn: <b>signInWithPhoneOnly</b> (legacy function name) validates the last-name username and phone-number password.",
    "Phone lookup: rpc <b>get_auth_user_id_by_phone</b> / <b>get_auth_user_id_by_phone_digits</b>.",
    "Phone number must already exist in invitations / inviters / team_invites, and the last name must match — otherwise sign-in is refused.",
    "Server signs in server-side after validating both credential fields, then returns tokens.",
    "Client calls <b>supabase.auth.setSession({access_token, refresh_token})</b>.",
    "Post-sign-in routing: <b>routeForUser(userId)</b> reads user_roles → /admin or /my-rsvp.",
    "Client middleware <b>attachSupabaseAuth</b> in src/start.ts attaches bearer to every serverFn call.",
    "Route gate: src/routes/_authenticated.tsx redirects unauthenticated users to /login.",
    "Intentional tradeoffs — <b>DO NOT re-introduce</b>: OTP flow or 7-day RSVP expiry. Keep credentials as last-name username + phone-number password.",
]:
    story.append(P("• " + line))

# 10. Server Functions
story.append(P("9. Server Functions Inventory", H1))
sf = [
    ("auth-phone.functions.ts", "signInWithPhoneOnly — last-name username + phone-number password login"),
    ("ai-access.functions.ts", "signInAsAiRole, listAiAccessAccounts — /ai-access portal"),
    ("invitations.functions.ts", "CRUD for invitations + tokens"),
    ("rsvp-totals.functions.ts", "Rollups for admin + committee cards"),
    ("guest-search.functions.ts", "Server-side guest search (admin / committee scoped)"),
    ("extract-contacts.functions.ts", "CSV / XLSX contact import parser"),
    ("entertainment-submit.functions.ts", "Entertainment submission intake"),
    ("entertainment-upload.functions.ts", "Entertainment media upload"),
    ("admin-audit.functions.ts", "Write to audit_log"),
    ("team.functions.ts", "Team invite / roster mutations"),
    ("email/send-server.ts", "Transactional email dispatcher"),
]
rows = [[Paragraph("<b>File (src/lib/)</b>", SMALL), Paragraph("<b>Exports / purpose</b>", SMALL)]]
for f, p in sf:
    rows.append([Paragraph(f"<font face='Courier'>{f}</font>", SMALL), Paragraph(p, SMALL)])
tt = Table(rows, colWidths=[2.4*inch, 3.8*inch], repeatRows=1)
tt.setStyle(TableStyle([
    ("FONT", (0,0), (-1,-1), "DejaVu", 8.5),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2fb")),
    ("GRID", (0,0), (-1,-1), 0.3, colors.grey),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story.append(tt)
story.append(Spacer(1, 6))
story.append(P("HTTP endpoints: <b>/api/public/*</b> (signature-verified webhooks/cron), "
               "<b>/lovable/email/auth/webhook</b>, <b>/lovable/email/transactional/{send,preview}</b>, "
               "<b>/lovable/email/queue/process</b>, <b>/lovable/email/suppression</b>, "
               "<b>/.mcp/list-tools</b> + <b>/.mcp/invoke-tool/$tool</b>, "
               "<b>/exports/$filename</b>, <b>/email/unsubscribe</b>."))

# 11. Email infra
story.append(P("10. Email Infrastructure", H1))
for line in [
    "Sender domain: <b>notify.cellibratehealth.com</b> (transactional infra only — user-facing brand is Taste of Conventions).",
    "Templates: src/lib/email-templates/ (invite, magic-link, recovery, signup, team-invite, rsvp-confirmation, email-change, reauthentication) — registered in registry.ts.",
    "Queue: email_queue drained by cron hitting /lovable/email/queue/process.",
    "Suppression: email_suppression + /lovable/email/suppression honors bounces / complaints / unsubscribes.",
    "Auth webhook: /lovable/email/auth/webhook renders Supabase auth emails with the brand templates.",
    "<b>GUEST-FACING EMAIL: none.</b> Guests are contacted by SMS only, from committee members' own phones.",
]:
    story.append(P("• " + line))

# 12. Conventions
story.append(P("11. Critical Conventions & Out-of-Scope", H1))
story.append(P("Always", H2))
for line in [
    "Phone/SMS-only for guest contact. Never collect / display / import / search / export guest email.",
    "Use <b>createServerFn</b> for app logic. Never introduce Supabase Edge Functions for app logic.",
    "Every new public.* table: GRANT + ENABLE RLS + policies in the SAME migration.",
    "Roles in <b>user_roles</b> table only — never on profile / users tables.",
    "Committee members promoted to 'team' role via <b>ensure_committee_team_role</b> at sign-in.",
    "Waitlist triggers only when in-person attendance hits 550. Inviter quotas do NOT trigger waitlist.",
    "Verify on 384×672 mobile viewport before declaring done. Compile ≠ verified.",
    "Seed inviters, categories, invitation_content via migration — not the client UI.",
]:
    story.append(P("• " + line))
story.append(P("Never / removed", H2))
for line in [
    "7-day RSVP expiry window — removed intentionally, do not re-add.",
    "Do not call login passwordless. The password is the phone number; the username is the last name.",
    "OTP / SMS-code login — not used. Last-name username + phone-number password is the only path.",
    "Supabase Edge Functions for app-internal logic.",
    "Cellibrate Health copy / dates in this project — different brand.",
    "Emails to guests — SMS only.",
]:
    story.append(P("• " + line))

# 13. Rebuild checklist
story.append(P("12. Rebuild Checklist (order matters)", H1))
for i, line in enumerate([
    "Scaffold TanStack Start v1 project with Tailwind v4 and Lovable Cloud enabled.",
    "Run migrations in order: events, invitations, invitation_content, inviters, rsvps, categories, category_assignments, cuisine_preorders, restaurants/menu, donations, guest_messages, team_messages, team_invites, user_roles, audit_log, recently_deleted, email_queue/suppression/events.",
    "Every table migration: GRANT → ENABLE RLS → policies (use has_role).",
    "Create app_role enum + has_role SECURITY DEFINER function.",
    "Create RPCs: get_auth_user_id_by_phone, get_auth_user_id_by_phone_digits, ensure_committee_team_role.",
    "Seed event singleton (id 000...001), invitation_content singleton, inviters, categories via migration.",
    "Build auth: src/routes/login.tsx + src/lib/auth-phone.functions.ts + _authenticated route gate + attachSupabaseAuth in start.ts.",
    "Build /my-rsvp (guest), /admin + subroutes (admin/team). Gate by has_role.",
    "Wire email infra: sender notify.cellibratehealth.com, templates, queue processor, auth webhook.",
    "Add /ai-access portal + ai-access.functions.ts for AI verification.",
    "Verify on 384×672 mobile viewport, signed in as each role, against production URL before shipping.",
], start=1):
    story.append(P(f"{i}. {line}"))

story.append(Spacer(1, 12))
story.append(P("End of guide — v5, generated 2026-07-16 UTC. Sign in via §1, then open every link in §3 "
               "against the live site to see what to replicate.",
               ParagraphStyle("End", parent=SMALL, alignment=1, textColor=colors.grey)))

out = "/mnt/documents/taste-of-conventions-replication-guide_v5.pdf"
doc = SimpleDocTemplate(out, pagesize=LETTER,
                        leftMargin=0.7*inch, rightMargin=0.7*inch,
                        topMargin=0.7*inch, bottomMargin=0.7*inch,
                        title="Taste of Conventions — Replication Guide v5")
doc.build(story)
print("wrote", out)
