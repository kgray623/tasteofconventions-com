import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share, PlusSquare, MoreVertical, Apple, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getInstallPromptSnapshot,
  initializeInstallPromptCapture,
  isStandaloneApp,
  promptToInstallApp,
  subscribeToInstallPrompt,
} from "@/pwa-install";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Install A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Add A Taste of Special Conventions to your home screen or desktop so it opens like an app — one tap, full-screen, same login.",
      },
      { property: "og:title", content: "Install A Taste of Special Conventions" },
      {
        property: "og:description",
        content: "Install the app on your phone, tablet, or Chromebook in a few seconds.",
      },
    ],
  }),
  component: InstallPage,
});

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    initializeInstallPromptCapture();
    setPlatform(detectPlatform());

    const sync = () => {
      const snap = getInstallPromptSnapshot();
      setInstalled(snap.installed || isStandaloneApp());
      setCanPrompt(Boolean(snap.prompt));
    };
    sync();
    const unsub = subscribeToInstallPrompt(sync);
    const timer = window.setTimeout(sync, 1500);
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    setBusy(true);
    try {
      const ok = await promptToInstallApp();
      if (ok) setInstalled(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elegant p-6 space-y-5">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <img src="/icon-192.png" alt="A Taste app icon" className="h-12 w-12 rounded-lg" />
          </div>
          <h1 className="font-display text-2xl text-ink">
            Install A Taste of Special Conventions
          </h1>
          <p className="text-sm text-muted-foreground">
            Add it to your home screen or desktop so it opens with one tap — just like a real app.
          </p>
        </div>

        {installed && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-ink">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            <span>You're already using the installed app. Nice!</span>
          </div>
        )}

        {!installed && platform === "ios" && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Apple className="h-5 w-5" /> iPhone / iPad (Safari)
            </div>
            <ol className="space-y-2 pl-1 text-ink">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-primary">1.</span>
                <span>
                  Tap the <Share className="inline h-4 w-4 align-text-bottom" />{" "}
                  <strong>Share</strong> button at the bottom of Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-primary">2.</span>
                <span>
                  Scroll down and tap <PlusSquare className="inline h-4 w-4 align-text-bottom" />{" "}
                  <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-primary">3.</span>
                <span>
                  Tap <strong>Add</strong>. The icon now lives on your home screen.
                </span>
              </li>
            </ol>
          </div>
        )}

        {!installed && platform === "android" && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Smartphone className="h-5 w-5" /> Android (Chrome)
            </div>
            {canPrompt ? (
              <Button onClick={handleInstall} disabled={busy} className="w-full">
                {busy ? "Installing…" : "Install app now"}
              </Button>
            ) : (
              <>
                <ol className="space-y-2 pl-1 text-ink">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-primary">1.</span>
                    <span>
                      Tap the <MoreVertical className="inline h-4 w-4 align-text-bottom" /> menu
                      in the top-right of Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-primary">2.</span>
                    <span>
                      Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong> if
                      you see it).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 font-bold text-primary">3.</span>
                    <span>
                      Tap <strong>Add</strong>. The icon now lives on your home screen.
                    </span>
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Don't see "Install app"? <strong>Add to Home screen</strong> works the same way
                  and is always available.
                </p>
              </>
            )}
          </div>
        )}

        {!installed && platform === "desktop" && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Smartphone className="h-5 w-5" /> Open this page on your phone
            </div>
            <p className="text-ink">
              For the home-screen icon, open{" "}
              <strong>tasteofconventions.com/install</strong> directly on your iPhone or Android
              browser, then follow the prompts.
            </p>
            {canPrompt && (
              <Button onClick={handleInstall} disabled={busy} className="w-full">
                {busy ? "Installing…" : "Install on this computer"}
              </Button>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-ink">Why install?</p>
          <ul className="mt-2 space-y-1">
            <li>• Opens full-screen, no browser bars</li>
            <li>• One tap from your home screen or desktop</li>
            <li>• Same login, same data — nothing to set up again</li>
          </ul>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/">Back to A Taste</Link>
        </Button>
      </div>
    </div>
  );
}
