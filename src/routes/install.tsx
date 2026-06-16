import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Save A Taste Shortcut" },
      {
        name: "description",
        content:
          "Save a one-tap shortcut to the A Taste login page on your phone or computer.",
      },
    ],
  }),
  component: InstallPage,
});

const LOGIN_URL = "https://tasteofconventions.com/login";

function downloadShortcut() {
  // .url files are clickable shortcuts on Chromebook, Windows, and most Linux
  // file managers. Double-tapping the saved file opens the login page in the
  // default browser.
  const contents = `[InternetShortcut]\r\nURL=${LOGIN_URL}\r\n`;
  const blob = new Blob([contents], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "A Taste login.url";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function InstallPage() {
  return (
    <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6 space-y-5 text-center">
        <a
          href="/login"
          aria-label="Open the A Taste login page"
          className="mx-auto block w-fit"
        >
          <img
            src="/icon-512.png"
            alt="A Taste of Special Conventions icon"
            className="h-40 w-40 rounded-2xl shadow-elegant transition-transform hover:scale-105"
          />
        </a>

        <h1 className="font-display text-2xl text-ink">Save A Taste Shortcut</h1>
        <p className="text-sm text-muted-foreground">
          Save a one-tap shortcut to the login page. Tap the icon above to open
          login right now.
        </p>

        <Button onClick={downloadShortcut} className="w-full" size="lg">
          <Download className="mr-2 h-5 w-5" />
          Save shortcut
        </Button>

        <Button asChild variant="outline" className="w-full">
          <a href="/icon-512.png" download="a-taste-of-special-conventions.png">
            <ImageIcon className="mr-2 h-5 w-5" />
            Save image only (no link)
          </a>
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}
