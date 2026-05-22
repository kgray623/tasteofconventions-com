import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useDraftState } from "@/hooks/use-draft-state";

export const Route = createFileRoute("/_authenticated/admin/chat")({
  component: ChatPage,
});

type Msg = { id: string; user_id: string; body: string; created_at: string };
type Profile = { id: string; display_name: string | null; email: string | null };

function ChatPage() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [body, setBody] = useDraftState(`team-chat:${user?.id ?? "guest"}`, "body", "");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [m, p] = await Promise.all([
      supabase.from("team_messages").select("*").order("created_at").limit(500),
      supabase.from("profiles").select("id,display_name,email"),
    ]);
    setMsgs(m.data ?? []);
    setProfiles(Object.fromEntries((p.data ?? []).map((x) => [x.id, x])));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("team-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, (payload) => {
        setMsgs((prev) => [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || !user) return;
    setBody("");
    const { error } = await supabase.from("team_messages").insert({ user_id: user.id, body: text });
    if (error) { toast.error(error.message); setBody(text); }
  };

  const labelFor = (id: string) => {
    const p = profiles[id];
    return p?.display_name || p?.email || id.slice(0, 8);
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-260px)] min-h-[420px] overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {msgs.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">
            No messages yet. Say hi to your team.
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? "bg-ink text-cream" : "bg-secondary"}`}>
                <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
                  {labelFor(m.user_id)} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border p-3 flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message your team… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="resize-none"
        />
        <Button onClick={send} className="bg-ink text-cream hover:bg-ink/90 self-stretch">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
