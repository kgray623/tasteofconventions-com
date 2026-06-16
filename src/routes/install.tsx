import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Copy, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "A Taste Desktop Shortcut" },
      {
        name: "description",
        content:
          "Save a desktop shortcut for A Taste of Special Conventions that opens directly to login.",
      },
      { property: "og:title", content: "A Taste Desktop Shortcut" },
      {
        property: "og:description",
        content: "Save a clickable shortcut that opens the login page.",
      },
    ],
  }),
  component: InstallPage,
});

type Platform = "chromeos" | "mac" | "windows" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/CrOS/i.test(ua)) return "chromeos";
  if (/Mac/i.test(ua)) return "mac";
  if (/Win/i.test(ua)) return "windows";
  return "other";
}

function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("other");
  const baseUrl =
    typeof window === "undefined"
      ? "https://tasteofconventions.com"
      : window.location.origin;
  const loginUrl = `${baseUrl}/login?installed=1`;

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  async function downloadIcon() {
    try {
      const res = await fetch("/icon-512.png");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "A Taste.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Icon downloaded to your Downloads folder.");
    } catch {
      toast.error("Could not download the icon. Long-press the image instead.");
    }
  }

  function downloadWindowsShortcut() {
    const contents = `[InternetShortcut]\r\nURL=${loginUrl}\r\nIconFile=${baseUrl}/icon-192.png\r\nIconIndex=0\r\n`;
    const blob = new Blob([contents], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "A Taste Login.url";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadMacShortcut() {
    const contents = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>${loginUrl}</string>
</dict>
</plist>`;
    const blob = new Blob([contents], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "A Taste Login.webloc";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyLoginLink() {
    try {
      await navigator.clipboard.writeText(loginUrl);
      toast.success("Login link copied.");
    } catch {
      toast.error("Could not copy. Long-press the link to copy manually.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6 space-y-5">
        <div className="text-center space-y-3">
          <a
            href="/login?installed=1"
            aria-label="Open the A Taste login page"
            className="mx-auto block w-fit"
          >
            <img
              src="/icon-512.png"
              alt="A Taste of Special Conventions icon"
              className="h-28 w-28 rounded-2xl shadow-elegant transition-transform hover:scale-105"
            />
          </a>
          <h1 className="font-display text-2xl text-ink">
            A Taste Desktop Shortcut
          </h1>
          <p className="text-sm text-muted-foreground">
            Download the icon, then drag it from your Downloads folder to your desktop.
          </p>
        </div>

        <Button onClick={downloadIcon} className="w-full" size="lg">
          <ImageIcon className="mr-2 h-5 w-5" />
          Download icon
        </Button>

        <Button onClick={copyLoginLink} variant="outline" className="w-full">
          <Copy className="mr-2 h-4 w-4" />
          Copy login link
        </Button>

        {platform === "chromeos" && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-ink">On Chromebook</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Tap <b>Download icon</b> above — it saves to Downloads.</li>
              <li>Open the <b>Files</b> app, find <b>A Taste.png</b> in Downloads.</li>
              <li>Drag it onto your <b>Desktop</b> shelf, or right‑click → <b>Pin to shelf</b>.</li>
              <li>To open login from the icon: right‑click the icon → <b>Open with</b> → your browser, or use the <b>Copy login link</b> button and paste it into a bookmark.</li>
            </ol>
            <p className="text-[11px]">
              Chromebooks don’t let websites save files directly to the desktop — you have to move it from Downloads. That’s a ChromeOS rule, not something this page can override.
            </p>
          </div>
        )}

        {platform === "windows" && (
          <Button onClick={downloadWindowsShortcut} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Windows shortcut (.url)
          </Button>
        )}

        {platform === "mac" && (
          <Button onClick={downloadMacShortcut} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Mac shortcut (.webloc)
          </Button>
        )}

        <Button asChild variant="ghost" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}
