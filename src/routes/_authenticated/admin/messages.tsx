import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GuestThread } from "@/components/guest-thread";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: GuestMessagesPage,
});

type Thread = {
  invitation_id: string;
  guest_name: string | null;
  last_at: string;
  last_body: string;
  count: number;
};

function GuestMessagesPage() {
  const { isAdmin, loading } = useRoles();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [broadcast, setBroadcast] = useState("");
  const [sending, setSending] = useState(false);

  const sendBroadcast = async () => {
    const body = broadcast.trim();
    if (!body) return;
    setSending(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data: invs, error: e1 } = await supabase.from("invitations").select("id");
      if (e1) throw e1;
      const rows = (invs ?? []).map((i) => ({
        invitation_id: i.id,
        sender: "admin",
        user_id: uid,
        body,
      }));
      if (rows.length === 0) {
        toast.info("No invitations to send to yet.");
        return;
      }
      const { error: e2 } = await supabase.from("guest_messages").insert(rows);
      if (e2) throw e2;
      toast.success(`Sent to ${rows.length} guest${rows.length === 1 ? "" : "s"}.`);
      setBroadcast("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to broadcast");
    } finally {
      setSending(false);
    }
  };

  const load = async () => {
    const { data: msgs } = await supabase
      .from("guest_messages")
      .select("invitation_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const ids = Array.from(new Set((msgs ?? []).map((m) => m.invitation_id)));
    const { data: invs } = await supabase
      .from("invitations")
      .select("id, guest_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const nameById = Object.fromEntries((invs ?? []).map((i) => [i.id, i.guest_name]));
    const grouped: Record<string, Thread> = {};
    (msgs ?? []).forEach((m) => {
      if (!grouped[m.invitation_id]) {
        grouped[m.invitation_id] = {
          invitation_id: m.invitation_id,
          guest_name: nameById[m.invitation_id] ?? "Unknown guest",
          last_at: m.created_at,
          last_body: m.body,
          count: 0,
        };
      }
      grouped[m.invitation_id].count += 1;
    });
    setThreads(Object.values(grouped));
  };

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      navigate({ to: "/admin" });
      return;
    }
    load();
    const ch = supabase
      .channel("admin-guest-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "guest_messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin, loading, navigate]);

  if (loading || !isAdmin) return null;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <p className="font-medium text-sm">Broadcast to all guests</p>
        </div>
        <Textarea
          value={broadcast}
          onChange={(e) => setBroadcast(e.target.value)}
          placeholder="Write a message that will be sent to every guest thread…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={sendBroadcast} disabled={sending || !broadcast.trim()}>
            {sending ? "Sending…" : "Send to all guests"}
          </Button>
        </div>
      </Card>
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
      <Card className="p-3 max-h-[70vh] overflow-y-auto">
        <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-2">
          Guest threads ({threads.length})
        </p>
        {threads.length === 0 && (
          <p className="text-sm text-muted-foreground italic px-2 py-3">No guest messages yet.</p>
        )}
        {threads.map((t) => (
          <button
            key={t.invitation_id}
            onClick={() => setSelected(t.invitation_id)}
            className={`w-full text-left px-3 py-2.5 rounded-md transition ${
              selected === t.invitation_id ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
          >
            <p className="font-medium text-sm">{t.guest_name}</p>
            <p className="text-xs text-muted-foreground truncate">{t.last_body}</p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              {new Date(t.last_at).toLocaleString()} · {t.count} msg
            </p>
          </button>
        ))}
      </Card>
      <div>
        {selected ? (
          <GuestThread
            invitationId={selected}
            asAdmin
            title={`Conversation with ${threads.find((t) => t.invitation_id === selected)?.guest_name ?? "guest"}`}
          />
        ) : (
          <Card className="p-10 text-center text-muted-foreground">
            Select a guest thread to view and reply.
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
