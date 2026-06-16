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
 * Live via Postgres realtime on the chat tables, plus a 60s safety poll.
 */
export function useChatUnread(): ChatUnread {
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<ChatUnread>(EMPTY);
  const refetchRef = useRef<() => void>(() => {});

  const fetchCounts = useCallback(async () => {
    if (!userId) {
      setData(EMPTY);
      return;
    }
    const { data: res, error } = await supabase.rpc("get_my_chat_unread");
    if (error || !res) return;
    setData(res as unknown as ChatUnread);
  }, [userId]);

  refetchRef.current = fetchCounts;

  useEffect(() => {
    if (!userId) {
      setData(EMPTY);
      return;
    }
    fetchCounts();

    const channel = supabase
      .channel(`chat-unread:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        () => refetchRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "category_messages" },
        () => refetchRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_last_seen", filter: `user_id=eq.${userId}` },
        () => refetchRef.current(),
      )
      .subscribe();

    const interval = setInterval(() => refetchRef.current(), 60_000);
    const onFocus = () => refetchRef.current();
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
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
