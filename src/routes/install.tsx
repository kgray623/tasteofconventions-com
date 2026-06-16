import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        content: "Save a clickable desktop shortcut that opens the login page.",
      },
    ],
  }),
  component: InstallPage,
});

function InstallPage() {
  const baseUrl = typeof window === "undefined" ? "https://tasteofconventions.com" : window.location.origin;
  const loginUrl = `${baseUrl}/login?installed=1`;
  const shortcutContents = `[InternetShortcut]\nURL=${loginUrl}\nIconFile=${baseUrl}/icon-192.png\nIconIndex=0\n`;
  const shortcutHref = `data:application/octet-stream;charset=utf-8,${encodeURIComponent(shortcutContents)}`;

  return (
    <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6 space-y-5 text-center">
        <div className="text-center space-y-3">
          <a href="/login?installed=1" aria-label="Open the A Taste login page" className="mx-auto block w-fit">
            <img
              src="/icon-512.png"
              alt="A Taste of Special Conventions shortcut icon"
              className="h-28 w-28 rounded-2xl shadow-elegant transition-transform hover:scale-105"
            />
          </a>
          <h1 className="font-display text-2xl text-ink">
            A Taste Desktop Shortcut
          </h1>
          <p className="text-sm text-muted-foreground">
            Save this shortcut to your desktop. Opening it takes you straight to login.
          </p>
        </div>

        <Button asChild className="w-full" size="lg">
          <a href={shortcutHref} download="A Taste Login.url">
            <Download className="mr-2 h-5 w-5" />
            Save desktop shortcut
          </a>
        </Button>

        <Button asChild variant="outline" className="w-full">
          <a href="/icon-512.png" download="A Taste icon.png">
            Save icon image
          </a>
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}
