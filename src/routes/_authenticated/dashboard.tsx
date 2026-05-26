import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Calendar as CalendarIcon, Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — A Taste of Special Conventions" }] }),
  component: Dashboard,
});

type Invite = {
  id: string; event_id: string; guest_name: string; guest_email: string | null;
  guest_phone: string | null; rsvp_token: string; created_at: string; host_id: string;
  is_committee: boolean;
  rsvps?: { status: string; party_size: number } | null;
};
type Flag = { id: string; invitation_a: string; invitation_b: string; match_type: string };
type EventRow = { id: string; title: string; starts_at: string; location: string | null };

function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);

  const load = async () => {
    const [{ data: e }, { data: i }, { data: f }] = await Promise.all([
      supabase.from("events").select("id,title,starts_at,location").order("starts_at"),
      supabase.from("invitations").select("id,event_id,guest_name,guest_email,guest_phone,rsvp_token,created_at,host_id,is_committee,rsvps(status,party_size)").order("created_at", { ascending: false }),
      supabase.from("duplicate_flags").select("*"),
    ]);
    setEvents(e ?? []);
    setInvites((i as unknown as Invite[]) ?? []);
    setFlags(f ?? []);
  };

  useEffect(() => { load(); }, []);

  const myInvites = invites.filter((i) => i.host_id === user?.id);
  const flaggedIds = new Set<string>();
  flags.forEach((f) => { flaggedIds.add(f.invitation_a); flaggedIds.add(f.invitation_b); });

  const deleteInvitation = async (invite: Invite) => {
    const { error } = await supabase.from("invitations").delete().eq("id", invite.id);
    if (error) {
      toast.error(`Couldn't delete: ${error.message}`);
      return;
    }
    toast.success(`Deleted ${invite.guest_name}`);
    await load();
  };

  const duplicateGuestButton = (invite: Invite) => (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
      <span className="font-medium">{invite.guest_name}</span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label={`Delete duplicate invitation for ${invite.guest_name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this guest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{invite.guest_name}</strong>
              {invite.guest_email ? ` (${invite.guest_email})` : ""} and their RSVP. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteInvitation(invite)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  );

  const stats = [
    { label: "Your invitations", value: myInvites.length },
    { label: "Total guest list", value: invites.length },
    { label: "Confirmed yes", value: invites.filter((i) => i.rsvps?.status === "yes").length },
    { label: "Committee RSVP'd", value: invites.filter((i) => i.is_committee && i.rsvps?.status === "yes").length },
    { label: "Duplicate flags", value: flags.length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Host dashboard</p>
          <h1 className="font-display text-4xl mt-2">Your guest list</h1>
        </div>
        <Link to="/invitations/new">
          <Button className="bg-ink text-cream hover:bg-ink/90">
            <Plus className="w-4 h-4 mr-2" /> New invitation
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl mt-2">{s.value}</p>
          </Card>
        ))}
      </div>

      {flags.length > 0 && (
        <Card className="p-6 border-terracotta/40 bg-terracotta/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-terracotta mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-display text-xl">Possible duplicate invitations</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We found {flags.length} {flags.length === 1 ? "match" : "matches"} across hosts. Review before sending.
              </p>
              <div className="mt-4 space-y-2">
                {flags.slice(0, 8).map((f) => {
                  const a = invites.find((i) => i.id === f.invitation_a);
                  const b = invites.find((i) => i.id === f.invitation_b);
                  if (!a || !b) return null;
                  return (
                    <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm bg-card border border-border rounded-md px-3 py-2">
                      <Badge variant="outline" className="border-terracotta text-terracotta">
                        {f.match_type} match
                      </Badge>
                      {duplicateGuestButton(a)}
                      <span className="text-muted-foreground">↔</span>
                      {duplicateGuestButton(b)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Upcoming events</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {events.map((e) => (
            <Card key={e.id} className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarIcon className="w-3.5 h-3.5" />
                {new Date(e.starts_at).toLocaleString()}
              </div>
              <h3 className="font-display text-xl mt-2">{e.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{e.location}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl mb-4">All invitations</h2>
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {invites.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No invitations yet. <Link to="/invitations/new" className="text-terracotta underline">Create the first one</Link>.
              </div>
            )}
            {invites.map((i) => {
              const isDupe = flaggedIds.has(i.id);
              return (
                <div key={i.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{i.guest_name}</span>
                      {i.is_committee && <Badge className="bg-terracotta text-cream hover:bg-terracotta text-[10px]">Committee</Badge>}
                      {isDupe && <Badge variant="outline" className="border-terracotta text-terracotta text-[10px]">duplicate</Badge>}
                      {i.host_id === user?.id && <Badge variant="secondary" className="text-[10px]">yours</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {i.guest_email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{i.guest_email}</span>}
                      {i.guest_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{i.guest_phone}</span>}
                    </div>
                  </div>
                  <RsvpBadge status={i.rsvps?.status} />
                  <Link to="/rsvp/$token" params={{ token: i.rsvp_token }} className="text-xs text-terracotta hover:underline">
                    Open RSVP link →
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Delete invitation for ${i.guest_name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this invitation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the invitation for <strong>{i.guest_name}</strong>
                          {i.guest_email ? ` (${i.guest_email})` : ""} along with their RSVP. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            await deleteInvitation(i);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RsvpBadge({ status }: { status?: string }) {
  if (!status || status === "pending") return <Badge variant="outline">awaiting</Badge>;
  if (status === "yes") return <Badge className="bg-gold text-ink hover:bg-gold">attending</Badge>;
  if (status === "no") return <Badge variant="secondary">declined</Badge>;
  return <Badge variant="outline">maybe</Badge>;
}
