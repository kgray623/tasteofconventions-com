
# Migration Guide PDF: Lovable → Another AI Coding Platform

I'll produce a downloadable PDF (`/mnt/documents/lovable-migration-guide.pdf`) that you can hand to ChatGPT, Claude, Cursor, Windsurf, or any other AI coding tool so they can pick up this exact project and keep building.

## What the PDF will contain

1. **Project overview**
   - App name, purpose (Taste of Conventions RSVP/invitation system), event date, live URLs.
   - Tech stack: TanStack Start v1, React 19, Vite 7, Tailwind v4, Supabase (database/auth/storage), Lovable AI Gateway (optional).

2. **Step 1 — Get the code out of Lovable via GitHub** (with diagrams)
   - Diagram: Lovable ⇄ GitHub ⇄ Your local machine ⇄ New AI tool.
   - Click-path: Lovable editor → "+" menu (bottom-left of chat) → GitHub → Connect project → authorize Lovable GitHub App → pick account/org → Create Repository.
   - How to clone locally: `git clone <repo-url>` and `bun install` (or `npm install`).
   - Note: two-way sync — edits in either place propagate.

3. **Step 2 — Export the database**
   - Cloud tab → Advanced settings → Export data.
   - Where the SQL dump lands and how to restore it into a self-hosted Supabase / Postgres.

4. **Step 3 — Environment variables you'll need**
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (from your `.env`).
   - `LOVABLE_API_KEY` — only if you keep using Lovable AI Gateway; otherwise swap for OpenAI/Anthropic keys.
   - Any connector secrets currently in use.

5. **Step 4 — Standing up Supabase yourself** (diagram of managed vs self-hosted)
   - Option A: create your own Supabase project at supabase.com, run the migrations in `supabase/migrations/`, import the data export, update `.env`.
   - Option B: self-host Supabase (Docker) — link to docs.

6. **Step 5 — Running locally with another AI tool**
   - Cursor / Windsurf / Claude Code / ChatGPT Codex: open the cloned repo, point the AI at it, run `bun dev`.
   - Prompt template to paste into the new AI so it understands the stack, routing rules (TanStack file-based routes in `src/routes/`), and the "never drop submitted user info / phone-only, no email" project rules from your memory.

7. **Step 6 — Deployment options after leaving Lovable**
   - Cloudflare Workers (the current runtime), Vercel, Netlify, or self-host.
   - DNS cutover for `tasteofconventions.com` away from Lovable.

8. **Step 7 — What you lose when you leave**
   - Lovable's preview, auto-sync, credit-based AI gateway, managed Supabase billing, published `.lovable.app` URL.
   - You take on: hosting bills, Supabase billing, AI API bills directly with the provider, CI/CD setup.

9. **Diagrams included** (rendered as images inside the PDF)
   - Architecture: Browser → TanStack Start (Cloudflare Worker) → Supabase.
   - Migration flow: Lovable → GitHub → Local → New AI + New Host + Your Supabase.
   - GitHub connect click-path illustration.

10. **Appendix**
    - File-tree overview of the important folders (`src/routes/`, `src/components/`, `src/integrations/supabase/`, `supabase/migrations/`).
    - Links: TanStack Start docs, Supabase docs, Cloudflare Workers docs, GitHub docs.

## Deliverable

A single PDF at `/mnt/documents/lovable-migration-guide.pdf`, generated with ReportLab (with visual QA on every page), delivered via a `<presentation-artifact>` tag so you can download it directly.

## What I will NOT do

- No code changes to the app.
- No changes to the database, routes, or components.
- No pricing comparison content in the PDF (I don't have verified numbers for competitor pricing and won't make claims I can't back up).
