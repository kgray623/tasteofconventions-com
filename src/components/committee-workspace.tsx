import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCog, CheckCircle2, Clock, ListChecks, Loader2, MessageSquare, Phone, Upload, UserPlus, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type CommitteeGuest = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  rsvp_status: string | null;
  party_size: number;
  invited_by: string | null;
  host_id: string;
};


export function CommitteeWorkspace() {
  const { user } = useAuth();
  const [guests, setGuests] = useState<CommitteeGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [settingRsvpId, setSettingRsvpId] = useState<string | null>(null);

  const loadGuests = async (alive: () => boolean = () => true) => {
    if (alive()) setLoadingGuests(true);
    try {
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .order("starts_at")
        .limit(1);
      const eventId = events?.[0]?.id;
      if (!eventId) {
        if (alive()) setGuests([]);
        return;
      }
      const { data, error } = await supabase
        .from("invitations")
        .select("id,guest_name,guest_phone,host_id,rsvps(status,party_size)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as {
        id: string;
        guest_name: string;
        guest_phone: string | null;
        host_id: string;
        rsvps: { status: string; party_size: number | null }[] | { status: string; party_size: number | null } | null;
      }[];
      const hostIds = Array.from(new Set(rows.map((r) => r.host_id).filter(Boolean)));
      const hostNames = new Map<string, string>();
      if (hostIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,display_name,email")
          .in("id", hostIds);
        for (const profile of profiles ?? []) {
          const name = (profile.display_name ?? "").trim() || (profile.email ?? "").split("@")[0] || "";
          if (name) hostNames.set(profile.id, name);
        }
      }
      if (!alive()) return;
      setGuests(
        rows.map((row) => {
          const rsvp = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
          return {
            id: row.id,
            guest_name: row.guest_name,
            guest_phone: row.guest_phone,
            rsvp_status: rsvp?.status ?? null,
            party_size: rsvp?.party_size ?? 1,
            invited_by: hostNames.get(row.host_id) ?? null,
            host_id: row.host_id,
          };
        }),
      );
    } catch (error) {
      console.error("[committee] guest list load failed", error);
      if (alive()) setGuests([]);
    } finally {
      if (alive()) setLoadingGuests(false);
    }
  };

  useEffect(() => {
    let alive = true;
    void loadGuests(() => alive);
    return () => {
      alive = false;
    };
  }, []);

  const setRsvpFor = async (
    guest: CommitteeGuest,
    value: "yes1" | "yes2" | "yes3" | "yes4" | "no" | "clear",
  ) => {
    setSettingRsvpId(guest.id);
    try {
      if (value === "clear") {
        const { error } = await supabase.from("rsvps").delete().eq("invitation_id", guest.id);
        if (error) throw error;
        toast.success(`Cleared RSVP for ${guest.guest_name}.`);
      } else {
        const status = value === "no" ? "no" : "yes";
        const partySize = value === "no" ? 1 : Number(value.replace("yes", ""));
        const { error } = await supabase.from("rsvps").upsert(
          {
            invitation_id: guest.id,
            status,
            party_size: partySize,
            attendance_mode: "in_person",
            responded_at: new Date().toISOString(),
          },
          { onConflict: "invitation_id" },
        );
        if (error) throw error;
        toast.success(
          status === "no"
            ? `Marked ${guest.guest_name} as declined.`
            : `Marked ${guest.guest_name} attending (${partySize}).`,
        );
      }
      await loadGuests();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Couldn't save RSVP", { description: msg });
    } finally {
      setSettingRsvpId(null);
    }
  };

  const myGuests = user ? guests.filter((g) => g.host_id === user.id) : [];


  const confirmedGuests = guests.filter((guest) => guest.rsvp_status === "yes");
  const confirmedPeople = confirmedGuests.reduce((total, guest) => total + guest.party_size, 0);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-terracotta/40 bg-terracotta/5">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-terracotta" />
            <h2 className="font-semibold">Confirmed RSVPs ({confirmedPeople} people / {confirmedGuests.length} responses)</h2>
          </div>
        </div>
        {loadingGuests ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading confirmed RSVPs…
          </div>
        ) : confirmedGuests.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No confirmed RSVPs yet.</div>
        ) : (
          <div className="divide-y divide-border max-h-[360px] overflow-auto">
            {confirmedGuests.map((guest) => (
              <div key={guest.id} className="p-4 flex flex-wrap items-center gap-3 text-sm">
                <p className="font-medium flex-1 min-w-[160px]">{guest.guest_name}</p>
                <Badge className="bg-gold text-ink hover:bg-gold">{guest.party_size} attending</Badge>
                {guest.invited_by && <span className="text-muted-foreground">Invited by {guest.invited_by}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold">Guest list ({guests.length})</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/upload" search={{ view: "committee" }}>
              <Upload className="w-4 h-4 mr-2" /> Add guests
            </Link>
          </Button>
        </div>
        {loadingGuests ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading guest list…
          </div>
        ) : guests.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No guests have been added yet.</div>
        ) : (
          <div className="divide-y divide-border max-h-[520px] overflow-auto">
            {guests.map((guest) => (
              <div key={guest.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium flex-1 min-w-[160px]">{guest.guest_name}</p>
                  <RsvpStatusBadge status={guest.rsvp_status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {guest.guest_phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {guest.guest_phone}
                    </span>
                  )}
                  {guest.invited_by && <span>Invited by {guest.invited_by}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Watch the Welcome Video</h2>
        <Card className="overflow-hidden border-ink/10 bg-ink/5">
          <div className="relative aspect-[9/16] md:aspect-video mx-auto w-full max-w-sm md:max-w-none">
            <iframe
              src="https://fast.wistia.net/embed/iframe/cf8d380y2y?videoFoam=true"
              title="Steering Committee welcome video"
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              frameBorder={0}
              scrolling="no"
            />
          </div>
        </Card>
      </div>

      <p className="text-muted-foreground">
        See the following where you can add your guests, chat with others, choose what to volunteer for, etc. If you have any issues with the platform, please screenshot it and text it to 808.278.7562.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild className="bg-ink text-cream hover:bg-ink/90 justify-start h-14">
          <Link to="/admin/categories" search={{ view: "committee" }}>
            <ListChecks className="w-4 h-4" /> Volunteer
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/upload" search={{ view: "committee" }}>
            <Upload className="w-4 h-4" /> Guest list / Add guests
          </Link>
        </Button>

        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/chat" search={{ view: "committee" }}>
            <MessageSquare className="w-4 h-4" /> Committee chat
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/" hash="datetime">
            <CalendarCog className="w-4 h-4" /> Event details
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/team" search={{ view: "committee" }}>
            <UserPlus className="w-4 h-4" /> Add committee member
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/preorders" search={{ view: "committee" }}>
            <Utensils className="w-4 h-4" /> Food report
          </Link>
        </Button>
      </div>
    </div>
  );
}

function RsvpStatusBadge({ status }: { status: string | null }) {
  if (status === "yes") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><Clock className="w-3 h-3 mr-1" /> RSVP'd yes</Badge>;
  }
  if (status === "no") return <Badge variant="secondary">Declined</Badge>;
  if (status === "waitlist") return <Badge variant="outline">Waitlist</Badge>;
  return <Badge variant="outline">Awaiting RSVP</Badge>;
}