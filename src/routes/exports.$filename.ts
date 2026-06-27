import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

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

        const [{ readFile }, { join }] = await Promise.all([
          import("node:fs/promises"),
          import("node:path"),
        ]);
        const bytes = await readFile(join(process.cwd(), "public", "exports", filename));

        return new Response(bytes, {
          headers: {
            "Content-Type": exportFile.contentType,
            "Content-Length": String(bytes.byteLength),
            "Content-Disposition": `attachment; filename="${exportFile.downloadName}"`,
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});