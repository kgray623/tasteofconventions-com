import { useEffect, useState } from "react";
import { Share, X, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getInstallPromptSnapshot,
  initializeInstallPromptCapture,
  promptToInstallApp,
  subscribeToInstallPrompt,
} from "@/pwa-install";

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line|TikTok|MicroMessenger/i.test(ua);
}

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [showHint, setShowHint] = useState<null | "ios" | "inapp" | "blocked">(null);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    initializeInstallPromptCapture();
    const _ios = isIos();
    const _inApp = isInAppBrowser();
    setIos(_ios);
    setInApp(_inApp);

    const syncInstallState = () => {
      const snapshot = getInstallPromptSnapshot();
      setInstalled(snapshot.installed);
      setCanPrompt(Boolean(snapshot.prompt));
      setChecked(true);
    };

    syncInstallState();
    const unsubscribe = subscribeToInstallPrompt(syncInstallState);
    const timer = window.setTimeout(syncInstallState, 1500);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  if (installed) return null;

  const label = busy ? "Installing…" : checked || ios || inApp || canPrompt ? "Install App" : "Preparing Install…";

  const handleClick = async () => {
    if (inApp) {
      setShowHint("inapp");
      return;
    }
    if (ios) {
      setShowHint("ios");
      return;
    }
    setBusy(true);
    try {
      const prompted = await promptToInstallApp();
      if (!prompted) setShowHint("blocked");
    } catch {
      setShowHint("blocked");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        disabled={busy}
        className={`bg-terracotta text-cream hover:bg-terracotta/90 shadow-md disabled:opacity-60 ${className}`}
      >
        <img
          src="/icon-192.png"
          alt=""
          aria-hidden="true"
          className="w-5 h-5 rounded mr-2"
        />
        {label}
      </Button>

      {showHint && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowHint(null)}
        >
          <div
            className="bg-card w-full max-w-md rounded-xl p-6 shadow-elegant relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowHint(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-ink"
            >
              <X className="w-5 h-5" />
            </button>

            {showHint === "ios" && (
              <div className="space-y-3">
                <h3 className="font-display text-xl text-ink">Add to Home Screen</h3>
                <p className="text-sm text-ink flex items-center gap-2 flex-wrap">
                  Tap the <Share className="w-4 h-4 inline" /> Share icon at the bottom of Safari,
                  then choose &quot;Add to Home Screen.&quot;
                </p>
                <div className="flex justify-center pt-1 text-terracotta">
                  <ArrowDown className="w-6 h-6 animate-bounce" />
                </div>
              </div>
            )}

            {showHint === "inapp" && (
              <div className="space-y-2">
                <h3 className="font-display text-xl text-ink">
                  Open in {ios ? "Safari" : "Chrome"}
                </h3>
                <p className="text-sm text-ink">
                  Tap the ⋯ menu and choose &quot;Open in {ios ? "Safari" : "Chrome"}&quot; to
                  install the app.
                </p>
              </div>
            )}

            {showHint === "blocked" && (
              <div className="space-y-4">
                <h3 className="font-display text-xl text-ink">Install A Taste on your Chromebook</h3>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">Option 1 — Address bar</p>
                  <p className="text-sm text-ink">
                    Look at the right edge of Chrome's address bar for a small
                    computer-with-down-arrow icon. Click it, then click <strong>Install</strong>.
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">
                    Option 2 — Chrome menu (use this if the icon isn't there)
                  </p>
                  <p className="text-sm text-ink">
                    Click the <strong>⋮</strong> menu (top-right of Chrome) →{" "}
                    <strong>Cast, save, and share</strong> →{" "}
                    <strong>Install page as app…</strong> → <strong>Install</strong>.
                  </p>
                </div>

                <div className="space-y-1 border-t border-border pt-3">
                  <p className="text-sm font-semibold text-ink">If neither option appears</p>
                  <p className="text-sm text-ink">
                    Chrome has remembered a previous dismissal for this site. Click{" "}
                    <strong>⋮</strong> → <strong>Settings</strong> →{" "}
                    <strong>Privacy and security</strong> → <strong>Site settings</strong> →{" "}
                    <strong>View permissions and data stored across sites</strong>, search for{" "}
                    <strong>tasteofconventions</strong>, and click <strong>Delete data</strong>.
                    Then reload this page and click Install App again.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
