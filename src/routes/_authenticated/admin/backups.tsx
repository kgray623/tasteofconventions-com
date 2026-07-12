import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Archive, ChevronDown, ChevronRight } from "lucide-react";


export const Route = createFileRoute("/_authenticated/admin/backups")({
  head: () => ({ meta: [{ title: "Backups — Admin" }] }),
  component: BackupsPage,
});

const files = [
  { filename: "taste-of-conventions-database-dump.zip", label: "Database dump (ZIP)", desc: "Full database snapshot for restore." },
  { filename: "taste-of-conventions-source.zip", label: "Source code (ZIP)", desc: "All application source files." },
  { filename: "taste-of-conventions-migrations.zip", label: "Database migrations (ZIP)", desc: "Every SQL migration in order." },
  { filename: "taste-of-conventions-admin-screenshots.zip", label: "Admin screenshots (ZIP)", desc: "Screenshots of admin screens." },
  { filename: "taste-of-conventions-database.xlsx", label: "Database spreadsheet (XLSX)", desc: "All tables in one Excel workbook." },
  { filename: "guests.csv", label: "Guests (CSV)", desc: "Guest list export." },
] as const;

type Filename = (typeof files)[number]["filename"];

function BackupsPage() {
  const [busy, setBusy] = useState<Filename | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (filename: Filename) => {
    setBusy(filename);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error("Sign in again before downloading.");

      const response = await fetch(`/exports/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Download failed (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error("The export file was empty.");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-terracotta/10 p-3 text-terracotta">
          <Archive className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Admin exports</p>
          <h2 className="font-display text-2xl">Download backup files</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Each file is served privately to signed-in admins. Tap a button to save it to this device.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {files.map((f) => (
          <Card key={f.filename} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
              <p className="text-[11px] text-muted-foreground/70 font-mono mt-1 truncate">{f.filename}</p>
            </div>
            <Button
              onClick={() => download(f.filename)}
              disabled={busy !== null}
              className="bg-ink text-cream hover:bg-ink/90 shrink-0 min-h-11"
            >
              <Download className="w-4 h-4 mr-2" />
              {busy === f.filename ? "Preparing…" : "Download"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
