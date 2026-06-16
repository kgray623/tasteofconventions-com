import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
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

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(isStandalone());
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
    setShowIosSheet(true);
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={handleInstall}
        className={`bg-terracotta text-cream hover:bg-terracotta/90 shadow-md ${className}`}
      >
        <Download className="w-4 h-4 mr-2" /> Download the app
      </Button>

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
