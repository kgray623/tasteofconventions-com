import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Save A Taste Shortcut" },
      {
        name: "description",
        content:
          "Save the A Taste icon to your phone or computer, then tap it to open the login page.",
      },
    ],
  }),
  component: InstallPage,
});

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
          Save the image, then tap it from your phone or computer to open the login page.
        </p>

        <Button asChild className="w-full" size="lg">
          <a href="/icon-512.png" download="a-taste-of-special-conventions.png">
            <Download className="mr-2 h-5 w-5" />
            Save image
          </a>
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}
