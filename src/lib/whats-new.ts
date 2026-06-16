import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registry of recently-shipped features. Add an entry every time a new
 * tile / button / page is introduced to the app. The NEW badge auto-hides
 * after `expiresInDays` (default 14) or once the user has interacted with it.
 */
export const WHATS_NEW: Record<string, { addedAt: string; expiresInDays?: number }> = {
  "admin:install-button": { addedAt: "2026-06-16" },
  "admin:rsvps-tile": { addedAt: "2026-06-16" },
  "admin:clickable-tiles": { addedAt: "2026-06-16" },
  "header:notification-bell": { addedAt: "2026-06-16" },
};


const DEFAULT_EXPIRES_DAYS = 14;

function storageKey(userId: string | null, key: string) {
  return `whatsnew:seen:${userId ?? "anon"}:${key}`;
}

function isWithinWindow(key: string) {
  const entry = WHATS_NEW[key];
  if (!entry) return false;
  const added = new Date(entry.addedAt).getTime();
  if (!Number.isFinite(added)) return false;
  const days = entry.expiresInDays ?? DEFAULT_EXPIRES_DAYS;
  return Date.now() - added < days * 24 * 60 * 60 * 1000;
}

export function useIsNew(key: string): boolean {
  const [userId, setUserId] = useState<string | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      try {
        setSeen(Boolean(localStorage.getItem(storageKey(uid, key))));
      } catch {
        setSeen(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (seen) return false;
  if (userId === null && typeof window === "undefined") return false;
  return isWithinWindow(key);
}

export function markSeen(key: string) {
  try {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      localStorage.setItem(storageKey(uid, key), String(Date.now()));
    });
  } catch {
    /* no-op */
  }
}
