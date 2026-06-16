import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Chrome, Download, MonitorDown, MoreVertical, PlusSquare, Share, Smartphone } from "lucide-react";
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
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios-safari";
  if (/android/.test(ua)) return "android-chrome";
  if (/macintosh|windows|linux|cros/.test(ua)) return "desktop";
  return "other";
}

function isLovableEditorPreview() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top || window.location.hostname.startsWith("id-preview--");
  } catch {
    return true;
  }
}

function InstallPage() {
  const snapshot = useSyncExternalStore(
    subscribeToInstallPrompt,
    getInstallPromptSnapshot,
    () => ({ prompt: null, installed: false }),
  );
  const platform = useMemo(detectPlatform, []);
  const [inEditorPreview, setInEditorPreview] = useState(false);
  const installed = snapshot.installed || (typeof window !== "undefined" && isStandaloneApp());

  useEffect(() => {
    setInEditorPreview(isLovableEditorPreview());
  }, []);

  const openLiveInstallPage = () => {
    window.open("https://tasteofconventions.com/install", "_blank", "noopener,noreferrer");
  };

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

        {inEditorPreview ? (
          <>
            <p className="text-sm text-muted-foreground">
              Chrome cannot add a real home-screen shortcut from inside the Lovable editor preview.
            </p>
            <Button size="lg" className="w-full" onClick={openLiveInstallPage}>
              <Chrome className="mr-2 h-5 w-5" />
              Open real install page
            </Button>
          </>
        ) : installed ? (
          <p className="text-sm text-muted-foreground">
            A Taste is already installed on this device. Open it from your home screen.
          </p>
        ) : snapshot.prompt ? (
          <>
            <p className="text-sm text-muted-foreground">Tap Install to add the A Taste icon. It opens the login page.</p>
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
            {platform === "android-chrome" && <AndroidInstructions />}
            {platform === "ios-safari" && <IosInstructions />}
            {platform === "desktop" && <DesktopInstructions />}
            {platform === "other" && <OtherInstructions />}
          </>
        )}

        <Button asChild variant="ghost" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}

function AndroidInstructions() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <Smartphone className="h-5 w-5 text-primary" /> Android Chrome
      </div>
      <ol className="space-y-2 text-muted-foreground">
        <li className="flex gap-2"><span className="font-semibold text-primary">1.</span><span>Tap the <MoreVertical className="inline h-4 w-4" /> menu in the top-right of Chrome.</span></li>
        <li className="flex gap-2"><span className="font-semibold text-primary">2.</span><span>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</span></li>
        <li className="flex gap-2"><span className="font-semibold text-primary">3.</span><span>Tap <strong>Add</strong>. The A Taste icon will open the login page.</span></li>
      </ol>
    </div>
  );
}

function IosInstructions() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <Smartphone className="h-5 w-5 text-primary" /> iPhone / iPad Safari
      </div>
      <ol className="space-y-2 text-muted-foreground">
        <li className="flex gap-2"><span className="font-semibold text-primary">1.</span><span>Tap the <Share className="inline h-4 w-4" /> Share button.</span></li>
        <li className="flex gap-2"><span className="font-semibold text-primary">2.</span><span>Tap <PlusSquare className="inline h-4 w-4" /> <strong>Add to Home Screen</strong>.</span></li>
        <li className="flex gap-2"><span className="font-semibold text-primary">3.</span><span>Tap <strong>Add</strong>. The icon opens the login page.</span></li>
      </ol>
    </div>
  );
}

function DesktopInstructions() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <MonitorDown className="h-5 w-5 text-primary" /> Chromebook / Chrome desktop
      </div>
      <ol className="space-y-2 text-muted-foreground">
        <li className="flex gap-2"><span className="font-semibold text-primary">1.</span><span>Open this page at <strong>tasteofconventions.com/install</strong>.</span></li>
        <li className="flex gap-2"><span className="font-semibold text-primary">2.</span><span>Click Chrome’s install icon in the address bar, or ⋮ → Save and share → Install page as app.</span></li>
        <li className="flex gap-2"><span className="font-semibold text-primary">3.</span><span>The desktop icon opens the login page.</span></li>
      </ol>
    </div>
  );
}

function OtherInstructions() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm text-ink">
      <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <span>Open tasteofconventions.com/install in Chrome or Safari, then use Add to Home Screen or Install app.</span>
    </div>
  );
}
