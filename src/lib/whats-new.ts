import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registry of recently-shipped features. Add an entry every time a new
 * tile / button / page is introduced to the app. The NEW badge auto-hides
 * after `expiresInDays` (default 14) or once the user has interacted with it.
 */
export const WHATS_NEW: Record<string, { addedAt: string; expiresInDays?: number }> = {
  "admin:rsvps-tile": { addedAt: "2026-06-16" },
  "header:notification-bell": { addedAt: "2026-06-16" },
  "committee:hide-welcome-video": { addedAt: "2026-06-16" },
  "login:last-name": { addedAt: "2026-06-16" },

  // Feature-level NEW badges (no per-row data badges)
  "committee:rsvp-totals-card": { addedAt: "2026-06-16" },
  "committee:my-rsvp-label": { addedAt: "2026-06-16" },
  "committee:filter-toggle": { addedAt: "2026-06-16" },
  "committee:row-actions": { addedAt: "2026-06-16" },
  "committee:new-yes-rsvps": { addedAt: "2026-06-16" },

  "dashboard:my-volunteer-chats": { addedAt: "2026-06-30" },
  "admin:my-volunteer-chats": { addedAt: "2026-06-30" },
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
  const [mounted, setMounted] = useState(false);

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
      setMounted(true);
    }).catch(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!mounted) return false;
  if (seen) return false;
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
