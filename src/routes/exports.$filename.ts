import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const EXPORTS: Record<string, { contentType: string; downloadName: string }> = {
  "taste-of-conventions-database.xlsx": {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    downloadName: "taste-of-conventions-database.xlsx",
  },
  "guests.csv": {
    contentType: "text/csv; charset=utf-8",
    downloadName: "guests.csv",
  },
  "taste-of-conventions-source.zip": {
    contentType: "application/zip",
    downloadName: "taste-of-conventions-source.zip",
  },
  "taste-of-conventions-migrations.zip": {
    contentType: "application/zip",
    downloadName: "taste-of-conventions-migrations.zip",
  },
  "taste-of-conventions-admin-screenshots.zip": {
    contentType: "application/zip",
    downloadName: "taste-of-conventions-admin-screenshots.zip",
  },
  "taste-of-conventions-database-dump.zip": {
    contentType: "application/zip",
    downloadName: "taste-of-conventions-database-dump.zip",
  },
};

export const Route = createFileRoute("/exports/$filename")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const filename = decodeURIComponent(new URL(request.url).pathname.split("/").pop() ?? "");
        const exportFile = EXPORTS[filename];

        if (!exportFile) {
          return new Response("Export not found", { status: 404 });
        }

        // Require admin authentication
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
        if (authErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
          _user_id: claims.claims.sub,
          _role: "admin",
        });
        if (roleErr || !isAdmin) {
          return new Response("Forbidden", { status: 403 });
        }

        const [{ readFile }, { join }] = await Promise.all([
          import("node:fs/promises"),
          import("node:path"),
        ]);
        const bytes = await readFile(join(process.cwd(), "private", "exports", filename));

        return new Response(bytes, {
          headers: {
            "Content-Type": exportFile.contentType,
            "Content-Length": String(bytes.byteLength),
            "Content-Disposition": `attachment; filename="${exportFile.downloadName}"`,
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
