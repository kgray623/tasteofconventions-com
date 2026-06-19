import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const TEAM_CHAT_SENTINEL = "00000000-0000-0000-0000-000000000001";

export type ChatUnread = {
  team: number;
  categories: { category_id: string; name: string; count: number }[];
  total: number;
};

const EMPTY: ChatUnread = { team: 0, categories: [], total: 0 };

/**
 * In-app unread badge data, scoped to the chats the current user is in:
 *  - team chat (only if they have team/admin role)
 *  - each category chat they're assigned to
 *
 * Kept intentionally light on mobile: one guarded fetch on mount, then a
 * guarded 60s poll while the app is visible. No realtime sockets here —
 * multiple sockets were locking up the mobile preview controls.
 */
export function useChatUnread(): ChatUnread {
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<ChatUnread>(EMPTY);
  const refetchRef = useRef<() => void>(() => {});
  const fetchingRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (fetchingRef.current) return;
    if (!userId) {
      setData(EMPTY);
      return;
    }
    fetchingRef.current = true;
    try {
      const { data: res, error } = await supabase.rpc("get_my_chat_unread");
      if (error || !res) return;
      setData(res as unknown as ChatUnread);
    } finally {
      fetchingRef.current = false;
    }
  }, [userId]);

  refetchRef.current = fetchCounts;

  useEffect(() => {
    if (!userId) {
      setData(EMPTY);
      return;
    }
    void fetchCounts();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refetchRef.current();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [userId, fetchCounts]);

  return data;
}

/** Mark a chat as seen now. No-op when not signed in. */
export async function markChatSeen(
  userId: string | undefined,
  kind: "team" | "category" | "guest",
  chatId: string | null,
) {
  if (!userId) return;
  const id = kind === "team" ? TEAM_CHAT_SENTINEL : chatId;
  if (!id) return;
  await supabase
    .from("chat_last_seen")
    .upsert(
      { user_id: userId, chat_kind: kind, chat_id: id, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,chat_kind,chat_id" },
    );
}
