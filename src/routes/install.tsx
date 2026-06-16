import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ExternalLink, Share, Smartphone } from "lucide-react";
import { useEffect, useSyncExternalStore, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getInstallPromptSnapshot,
  isStandaloneApp,
  promptToInstallApp,
  subscribeToInstallPrompt,
} from "@/pwa-install";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Save A Taste App" },
      {
        name: "description",
        content:
          "Save A Taste of Special Conventions to your computer, tablet, or phone home screen.",
      },
      { property: "og:title", content: "Save A Taste App" },
      {
        property: "og:description",
        content: "Open A Taste directly from an app icon to the login page.",
      },
    ],
  }),
  component: InstallPage,
});

type Platform = "ios" | "android" | "chromeos" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || "";
  if (/iPad|iPhone|iPod/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/CrOS/i.test(ua)) return "chromeos";
  if (/Mac|Win|Linux/i.test(platform) || /Mac|Windows|Linux/i.test(ua)) return "desktop";
  return "other";
}

function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [standalone, setStandalone] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const installState = useSyncExternalStore(
    subscribeToInstallPrompt,
    getInstallPromptSnapshot,
    getInstallPromptSnapshot,
  );
  const installed = installState.installed || standalone;

  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(isStandaloneApp());
  }, []);

  async function installApp() {
    const prompted = await promptToInstallApp();
    if (prompted) return;
    setShowFallback(true);
    toast.message("Follow the steps below to save or install this app.");
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
          <h1 className="font-display text-2xl text-ink">Save A Taste App</h1>
          <p className="text-sm text-muted-foreground">
            Save it to your computer, tablet, or phone screen, then open straight to login.
          </p>
        </div>

        <Button onClick={installApp} className="w-full" size="lg" disabled={installed}>
          <Download className="mr-2 h-5 w-5" />
          {installed ? "App already saved" : installState.prompt ? "Save app" : "Save or install app"}
        </Button>

        <Button asChild variant="outline" className="w-full">
          <a href="/login?installed=1">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open login
          </a>
        </Button>

        {(platform === "ios" || platform === "android") && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-ink">On phone or tablet</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Tap the browser <b>Share</b> or menu button.</li>
              <li>Choose <b>Add to Home Screen</b> or <b>Install app</b>.</li>
              <li>Tap the saved A Taste icon to open login.</li>
            </ol>
          </div>
        )}

        {(platform === "chromeos" || platform === "desktop" || platform === "other") && (showFallback || (!installState.prompt && !installed)) && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-2">
            <p className="font-semibold text-ink">If the save box does not appear</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open your browser menu (the three dots in the top-right corner).</li>
              <li>Choose <b>Install A Taste</b>, <b>Save and share → Install page as app</b>, or <b>Create shortcut</b>.</li>
              <li>Confirm <b>Install</b>. The A Taste icon appears in your apps / shelf / home screen.</li>
            </ol>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          <Share className="h-4 w-4" />
          <Download className="h-4 w-4" />
        </div>

        <Button asChild variant="ghost" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}
