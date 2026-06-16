import { createFileRoute, Link } from "@tanstack/react-router";
import { useSyncExternalStore, useMemo } from "react";
import { Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getInstallPromptSnapshot,
  isStandaloneApp,
  promptToInstallApp,
  subscribeToInstallPrompt,
} from "@/pwa-install";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Add A Taste to your home screen" },
      {
        name: "description",
        content:
          "Add a one-tap A Taste icon to your phone or computer home screen.",
      },
    ],
  }),
  component: InstallPage,
});

function detectPlatform(): "android-chrome" | "ios-safari" | "desktop" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios-safari";
  if (/Android/.test(ua)) return "android-chrome";
  if (/Macintosh|Windows|Linux|CrOS/.test(ua)) return "desktop";
  return "other";
}

function InstallPage() {
  const snapshot = useSyncExternalStore(
    subscribeToInstallPrompt,
    getInstallPromptSnapshot,
    () => ({ prompt: null, installed: false }),
  );
  const platform = useMemo(detectPlatform, []);
  const installed = snapshot.installed || (typeof window !== "undefined" && isStandaloneApp());

  const instructions = (() => {
    switch (platform) {
      case "android-chrome":
        return "In Chrome, tap the ⋮ menu (top-right) → Add to Home screen → Install.";
      case "ios-safari":
        return "In Safari, tap the Share button → Add to Home Screen.";
      case "desktop":
        return "In Chrome, click the install icon in the address bar, or the ⋮ menu → Save and share → Install page as app.";
      default:
        return "Open your browser menu and choose Add to Home Screen or Install app.";
    }
  })();

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

        <h1 className="font-display text-2xl text-ink">Add A Taste to your home screen</h1>

        {installed ? (
          <p className="text-sm text-muted-foreground">
            A Taste is already installed on this device. Open it from your home screen.
          </p>
        ) : snapshot.prompt ? (
          <>
            <p className="text-sm text-muted-foreground">
              Tap Install to add the A Taste icon to your home screen. Tapping the icon
              will open the login page.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                void promptToInstallApp();
              }}
            >
              <Download className="mr-2 h-5 w-5" />
              Install A Taste
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Your browser doesn't show an automatic install button on this page.
              Use the one built into your browser:
            </p>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm text-ink">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>{instructions}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Once added, tapping the A Taste icon on your home screen opens the login page.
            </p>
          </>
        )}

        <Button asChild variant="ghost" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}
