import { useEffect, useState } from "react";
import { Share, X, ArrowDown } from "lucide-react";
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
  const [showHint, setShowHint] = useState<null | "ios" | "inapp">(null);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  // "waiting" until beforeinstallprompt fires (or 5s timeout marks unavailable)
  const [readyState, setReadyState] = useState<"waiting" | "ready" | "unavailable">("waiting");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(isStandalone());
    const _ios = isIos();
    const _inApp = isInAppBrowser();
    setIos(_ios);
    setInApp(_inApp);
    // iOS Safari and in-app browsers never fire beforeinstallprompt — they're
    // immediately "ready" (their handlers don't use the deferred event).
    if (_ios || _inApp) {
      setReadyState("ready");
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setReadyState("ready");
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => {
      setReadyState((prev) => (prev === "waiting" ? "unavailable" : prev));
    }, 5000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  if (installed) return null;

  const label =
    readyState === "waiting"
      ? "Preparing install…"
      : readyState === "unavailable"
        ? "Install not available"
        : ios
          ? "Add to Home Screen"
          : inApp
            ? `Open in ${ios ? "Safari" : "Chrome"}`
            : "Install app";

  const disabled = readyState !== "ready" || busy;

  const handleClick = async () => {
    if (inApp) {
      setShowHint("inapp");
      return;
    }
    if (ios) {
      setShowHint("ios");
      return;
    }
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    } finally {
      setDeferred(null);
      setBusy(false);
      // Most browsers fire the event only once; mark unavailable so the
      // button doesn't sit forever in "ready" state with no prompt to fire.
      setReadyState("unavailable");
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
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
          </div>
        </div>
      )}
    </>
  );
}
