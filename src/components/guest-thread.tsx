import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";

type GM = {
  id: string;
  invitation_id: string;
  sender: "guest" | "admin";
  body: string;
  created_at: string;
};

export function GuestThread({
  invitationId,
  asAdmin = false,
  className = "",
  title = "Message the host",
}: {
  invitationId: string;
  asAdmin?: boolean;
  className?: string;
  title?: string;
}) {
  const [msgs, setMsgs] = useState<GM[]>([]);
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invitationId) return;
    (async () => {
      const { data } = await supabase
        .from("guest_messages")
        .select("*")
        .eq("invitation_id", invitationId)
        .order("created_at");
      setMsgs((data as GM[]) ?? []);
    })();
    const ch = supabase
      .channel(`gm-${invitationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "guest_messages", filter: `invitation_id=eq.${invitationId}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as GM]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [invitationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.length]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    let payload: any = { invitation_id: invitationId, sender: "guest", body: text };
    if (asAdmin) {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return toast.error("Sign in required");
      payload = { invitation_id: invitationId, sender: "admin", user_id: u.user.id, body: text };
    }
    const { error } = await supabase.from("guest_messages").insert(payload);
    if (error) {
      toast.error(error.message);
      setBody(text);
    }
  };

  return (
    <Card className={`p-5 space-y-3 ${className}`}>
      <h3 className="font-display text-xl">{title}</h3>
      <div ref={scrollRef} className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {msgs.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No messages yet.</p>
        )}
        {msgs.map((m) => {
          const mine = asAdmin ? m.sender === "admin" : m.sender === "guest";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? "bg-ink text-cream" : "bg-secondary"}`}>
                <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                  {m.sender === "admin" ? "Host" : "Guest"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={asAdmin ? "Reply to guest…" : "Write a message to the host…"}
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
