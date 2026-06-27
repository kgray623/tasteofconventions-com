import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ALLOWED_FILES = new Set([
  "taste-of-conventions-database.xlsx",
  "guests.csv",
  "taste-of-conventions-source.zip",
  "taste-of-conventions-migrations.zip",
  "taste-of-conventions-admin-screenshots.zip",
  "taste-of-conventions-database-dump.zip",
]);

export const Route = createFileRoute("/exports/$filename")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const filename = decodeURIComponent(new URL(request.url).pathname.split("/").pop() ?? "");
        if (!ALLOWED_FILES.has(filename)) {
          return new Response("Export not found", { status: 404 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: authErr } = await supabase.auth.getClaims(token);
        const uid = claimsData?.claims?.sub;
        if (authErr || !uid) return new Response("Unauthorized", { status: 401 });

        const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        if (roleErr || !isAdmin) return new Response("Forbidden", { status: 403 });

        // Issue a short-lived signed URL via service role and redirect.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from("admin-exports")
          .createSignedUrl(filename, 60, { download: filename });
        if (signErr || !signed?.signedUrl) {
          console.error("[exports] sign error:", signErr?.message);
          return new Response("Unable to issue download link", { status: 500 });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: signed.signedUrl,
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
