import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  getNewRsvpNotifications,
  RSVP_FEED_SENTINEL,
  type RsvpNotification,
} from "@/lib/rsvp-notifications.functions";

export type NewRsvps = {
  items: RsvpNotification[];
  count: number;
  isAdmin: boolean;
  refresh: () => void;
  markSeen: () => Promise<void>;
};

/**
 * New RSVP replies since the user last checked, for the header bell.
 * Same light-touch polling as chat unread: mount, 60s while visible,
 * plus a refetch whenever the route changes.
 */
export function useNewRsvps(): NewRsvps {
  const { user } = useAuth();
  const userId = user?.id;
  const fetchNew = useServerFn(getNewRsvpNotifications);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [items, setItems] = useState<RsvpNotification[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const fetchingRef = useRef(false);
  const refetchRef = useRef<() => void>(() => {});

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    if (!userId) {
      setItems([]);
      return;
    }
    fetchingRef.current = true;
    try {
      const res = await fetchNew({ data: {} });
      if (!res) return;
      setItems(res.items ?? []);
      setIsAdmin(Boolean(res.isAdmin));
    } catch {
      /* keep the previous list; the bell must never break the header */
    } finally {
      fetchingRef.current = false;
    }
  }, [fetchNew, userId]);

  refetchRef.current = () => void refresh();

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refetchRef.current();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [userId, refresh, pathname]);

  const markSeen = useCallback(async () => {
    if (!userId) return;
    setItems([]);
    await supabase.from("chat_last_seen").upsert(
      {
        user_id: userId,
        chat_kind: "rsvp",
        chat_id: RSVP_FEED_SENTINEL,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,chat_kind,chat_id" },
    );
  }, [userId]);

  return { items, count: items.length, isAdmin, refresh: () => void refresh(), markSeen };
}
