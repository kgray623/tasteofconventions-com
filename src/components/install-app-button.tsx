import { useEffect, useState } from "react";
import { Chrome, Download, Share, X, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(mq || ios);
}

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHint, setShowHint] = useState<null | "ios" | "inapp" | "chrome">(null);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(isStandalone());
    const _ios = isIos();
    const _inApp = isInAppBrowser();
    setIos(_ios);
    setInApp(_inApp);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const label = busy ? "Installing…" : "Install App";

  const handleClick = async () => {
    if (inApp) {
      setShowHint("inapp");
      return;
    }
    if (ios) {
      setShowHint("ios");
      return;
    }
    if (!deferred) {
      setShowHint("chrome");
      return;
    }
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    } finally {
      setDeferred(null);
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

            {showHint === "chrome" && (
              <div className="space-y-3">
                <h3 className="font-display text-xl text-ink">Install with Chrome</h3>
                <p className="text-sm text-ink">
                  On your Chromebook, open tasteofconventions.com in Chrome, then click
                  <span className="inline-flex items-center gap-1 px-1 font-medium">
                    <Download className="w-4 h-4" /> Install
                  </span>
                  in the address bar.
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Chrome className="w-4 h-4 shrink-0" /> If Chrome does not show the icon, open
                  the ⋮ menu and choose Install app.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
