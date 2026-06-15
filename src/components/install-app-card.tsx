import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRoles } from "@/hooks/use-roles";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "toc:install-app-dismissed-until";
const DISMISS_DAYS = 7;

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

export function InstallAppCard() {
  const { isAdmin, isTeam } = useRoles();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(isStandalone());

    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until && Date.now() < until) setDismissed(true);
    } catch {
      /* ignore */
    }

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

  if (installed || dismissed) return null;

  const subtitle = isAdmin
    ? "One-tap access to admin tools and chat."
    : isTeam
      ? "Open your committee workspace from your home screen."
      : "Get event updates, the menu, and your RSVP in one tap.";

  const handleInstall = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {
        /* ignore */
      } finally {
        setDeferred(null);
      }
      return;
    }
    if (isIos()) {
      setShowIosSheet(true);
      return;
    }
    // Desktop / unsupported — show iOS-style instructions as a generic fallback.
    setShowIosSheet(true);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <>
      <Card className="p-5 sm:p-6 border-2 border-terracotta/40 bg-gradient-to-br from-cream to-terracotta/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-ink text-cream flex items-center justify-center shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl text-ink leading-tight">
              Install the Taste of Conventions app
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                type="button"
                onClick={handleInstall}
                className="bg-ink text-cream hover:bg-ink/90"
              >
                Install app
              </Button>
              <Button type="button" variant="ghost" onClick={handleDismiss}>
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {showIosSheet && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIosSheet(false)}
        >
          <div
            className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-2xl text-ink">Add to Home Screen</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowIosSheet(false)}
                className="text-muted-foreground hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="text-sm text-ink space-y-3">
              <li className="flex items-center gap-3">
                <span className="font-display text-lg w-6">1.</span>
                <span className="flex items-center gap-2">
                  Tap the <Share className="w-4 h-4 inline" /> Share icon in your browser.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="font-display text-lg w-6">2.</span>
                <span className="flex items-center gap-2">
                  Choose <Plus className="w-4 h-4 inline" /> &quot;Add to Home Screen.&quot;
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="font-display text-lg w-6">3.</span>
                <span>Tap Add. The app opens from your home screen.</span>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              On Android Chrome you'll see an install prompt automatically — tap Install when it
              appears.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
