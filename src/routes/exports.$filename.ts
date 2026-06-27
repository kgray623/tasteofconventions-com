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

const CONTENT_TYPES: Record<string, string> = {
  "taste-of-conventions-database.xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "guests.csv": "text/csv; charset=utf-8",
  "taste-of-conventions-source.zip": "application/zip",
  "taste-of-conventions-migrations.zip": "application/zip",
  "taste-of-conventions-admin-screenshots.zip": "application/zip",
  "taste-of-conventions-database-dump.zip": "application/zip",
};

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

        // Stream the private export through this authorized route so app downloads
        // work from mobile/desktop without exposing public storage links.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: file, error: downloadErr } = await supabaseAdmin.storage
          .from("admin-exports")
          .download(filename);
        if (downloadErr || !file) {
          console.error("[exports] download error:", downloadErr?.message);
          return new Response("Export not found", { status: 404 });
        }

        return new Response(file, {
          status: 200,
          headers: {
            "Content-Type": CONTENT_TYPES[filename] ?? "application/octet-stream",
            "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
