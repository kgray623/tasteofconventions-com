import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { logPageVisit } from "@/lib/site-traffic.functions";

const SESSION_KEY = "_stv_sid";
const SESSION_SEEN_KEY = "_stv_seen";

function getOrCreateSessionId(): { sessionId: string; isFirst: boolean } {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    let isFirst = false;
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2));
      sessionStorage.setItem(SESSION_KEY, sid);
      isFirst = !sessionStorage.getItem(SESSION_SEEN_KEY);
      sessionStorage.setItem(SESSION_SEEN_KEY, "1");
    }
    return { sessionId: sid, isFirst };
  } catch {
    return { sessionId: "anon", isFirst: false };
  }
}

/** Fires one page_visits row per route change. Silent on failure. */
export function SiteTrafficTracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const log = useServerFn(logPageVisit);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip admin/committee/internal paths — traffic dashboard tracks public surface.
    if (path.startsWith("/admin") || path.startsWith("/ai-access")) return;
    if (lastPath.current === path) return;
    lastPath.current = path;

    const { sessionId, isFirst } = getOrCreateSessionId();
    // Fire and forget
    void log({
      data: {
        path,
        referrer: document.referrer || null,
        sessionId,
        isUnique: isFirst,
      },
    }).catch(() => null);
  }, [path, log]);

  return null;
}
