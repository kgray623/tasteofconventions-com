import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { markChatSeen } from "@/hooks/use-chat-unread";
import { withTimeout } from "@/lib/async-safety";


type Msg = {
  id: string;
  category_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryId: string;
  categoryName: string;
  canChat: boolean;
  isAdmin: boolean;
  nameFor: (userId: string) => string;
};

export function CategoryChat({ open, onOpenChange, categoryId, categoryName, canChat, isAdmin, nameFor }: Props) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMessagesRef = useRef(false);

  const load = async () => {
    if (loadingMessagesRef.current) return;
    loadingMessagesRef.current = true;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("category_messages")
          .select("*")
          .eq("category_id", categoryId)
          .order("created_at", { ascending: true }),
      );
      if (error) return;
      setMsgs(data ?? []);
    } finally {
      loadingMessagesRef.current = false;
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    void markChatSeen(user?.id, "category", categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId, user?.id]);


  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const send = async () => {
    if (!user) return toast.error("Please sign in.");
    const body = draft.trim();
    if (!body) return;
    setLoading(true);
    try {
      const { error } = await withTimeout(
        supabase.from("category_messages").insert({
          category_id: categoryId,
          user_id: user.id,
          body,
        }),
      );
      if (error) return toast.error(error.message);
      setDraft("");
      await load();
      void markChatSeen(user?.id, "category", categoryId);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await withTimeout(supabase.from("category_messages").delete().eq("id", id));
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{categoryName} chat</DialogTitle>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="h-[360px] overflow-y-auto space-y-2 rounded-md border bg-secondary/30 p-3"
        >
          {msgs.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-8">
              No messages yet. Start the conversation.
            </p>
          )}
          {msgs.map((m) => {
            const mine = user?.id === m.user_id;
            const canDelete = mine || isAdmin;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`group max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-terracotta text-cream" : "bg-background border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] uppercase tracking-wider ${mine ? "text-cream/80" : "text-muted-foreground"}`}>
                      {nameFor(m.user_id)}
                    </span>
                    <span className={`text-[10px] ${mine ? "text-cream/60" : "text-muted-foreground/60"}`}>
                      {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => remove(m.id)}
                        className={`opacity-0 group-hover:opacity-100 transition ${mine ? "text-cream/80 hover:text-cream" : "text-muted-foreground hover:text-terracotta"}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        {canChat ? (
          <div className="flex gap-2 items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              className="min-h-[60px] resize-none"
            />
            <Button onClick={send} disabled={loading || !draft.trim()} className="bg-terracotta text-cream hover:bg-terracotta/90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic text-center">
            Volunteer for this category to join the conversation.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
