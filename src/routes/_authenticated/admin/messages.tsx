import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { GuestThread } from "@/components/guest-thread";

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
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

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
    load();
    const ch = supabase
      .channel("admin-guest-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "guest_messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
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
  );
}
