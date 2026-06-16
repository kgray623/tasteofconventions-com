import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  getInstallPromptSnapshot,
  initializeInstallPromptCapture,
  promptToInstallApp,
  subscribeToInstallPrompt,
} from "@/pwa-install";

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    initializeInstallPromptCapture();

    const sync = () => {
      const snap = getInstallPromptSnapshot();
      setInstalled(snap.installed);
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

  if (installed) return null;

  const baseClasses = `bg-terracotta text-cream hover:bg-terracotta/90 shadow-md disabled:opacity-60 ${className}`;

  const iconImg = (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      className="w-5 h-5 rounded mr-2"
    />
  );

  if (canPrompt) {
    const handleClick = async () => {
      setBusy(true);
      try {
        await promptToInstallApp();
      } finally {
        setBusy(false);
      }
    };
    return (
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        disabled={busy}
        className={baseClasses}
      >
        {iconImg}
        {busy ? "Installing…" : "Install App"}
      </Button>
    );
  }

  return (
    <Button asChild type="button" size="sm" className={baseClasses}>
      <Link to="/install">
        {iconImg}
        Install App
      </Link>
    </Button>
  );
}
