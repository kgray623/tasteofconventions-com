// Service workers were removed because iPhone Safari was serving stale RSVP pages.
// Keep this cleanup so any previously installed worker and its caches are cleared.

async function unregisterStale() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.map((r) => r.unregister()));
    if ("caches" in window) {
      const names = await window.caches.keys();
      await Promise.allSettled(names.map((name) => window.caches.delete(name)));
    }
  } catch {
    /* ignore */
  }
}

export function registerPwa() {
  if (typeof window === "undefined") return;
  if (document.readyState === "complete") {
    void unregisterStale();
  } else {
    window.addEventListener("load", () => void unregisterStale(), { once: true });
  }
}
