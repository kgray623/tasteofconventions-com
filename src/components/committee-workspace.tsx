import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCog, CheckCircle2, ChevronDown, Clock, EyeOff, ListChecks, Loader2, MessageSquare, Phone, Upload, UserPlus, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const WELCOME_HIDE_KEY = "toc.committee.welcomeVideoHidden";

export function CommitteeWorkspace() {
  const { user } = useAuth();
  const [guests, setGuests] = useState<CommitteeGuest[]>([]);
  const [myHostIds, setMyHostIds] = useState<string[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [settingRsvpId, setSettingRsvpId] = useState<string | null>(null);
  const [hideWelcome, setHideWelcome] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("my");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHideWelcome(window.localStorage.getItem(WELCOME_HIDE_KEY) === "1");
  }, []);

  const dismissWelcome = () => {
    setHideWelcome(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WELCOME_HIDE_KEY, "1");
    }
  };

  const showWelcome = () => {
    setHideWelcome(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(WELCOME_HIDE_KEY);
    }
  };

  const loadGuests = async (alive: () => boolean = () => true) => {
    if (alive()) setLoadingGuests(true);
    try {
      // Build the set of host_ids that count as "mine":
      // the logged-in user + any inviter record linked to this user
      // (by host_id, or by matching phone — handles people with multiple accounts).
      const mineSet = new Set<string>();
      if (user?.id) mineSet.add(user.id);
      const userPhone: string | undefined =
        (user as { phone?: string } | null)?.phone ||
        ((user?.user_metadata as { phone?: string } | undefined)?.phone ?? undefined);
      const phoneDigits = (userPhone ?? "").replace(/\D/g, "");
      const tail10 = phoneDigits.slice(-10);
      // Also match by display name (handles users with multiple accounts
      // where the inviter row has no phone — link by name instead).
      let myName = "";
      try {
        if (user?.id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle();
          myName = (prof?.display_name ?? "").trim().toLowerCase();
        }
      } catch (e) {
        console.warn("[committee] profile lookup failed", e);
      }
      try {
        const { data: inviterRows } = await supabase
          .from("inviters")
          .select("host_id,phone,name");
        for (const row of inviterRows ?? []) {
          if (!row.host_id) continue;
          if (row.host_id === user?.id) {
            mineSet.add(row.host_id);
            continue;
          }
          const rowDigits = (row.phone ?? "").replace(/\D/g, "");
          if (tail10 && rowDigits && rowDigits.slice(-10) === tail10) {
            mineSet.add(row.host_id);
            continue;
          }
          const rowName = (row.name ?? "").trim().toLowerCase();
          if (myName && rowName && rowName === myName) {
            mineSet.add(row.host_id);
          }
        }
      } catch (e) {
        console.warn("[committee] inviter lookup failed", e);
      }
      if (alive()) setMyHostIds(Array.from(mineSet));

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

  const mineHostIdSet = new Set(myHostIds.length ? myHostIds : user ? [user.id] : []);
  const myGuests = user ? guests.filter((g) => mineHostIdSet.has(g.host_id)) : [];
  const confirmedGuests = guests.filter((guest) => guest.rsvp_status === "yes");
  const confirmedPeople = confirmedGuests.reduce((total, guest) => total + guest.party_size, 0);

  const toggleSection = (key: string) => setOpenSection((prev) => (prev === key ? null : key));

  return (
    <div className="space-y-6">
      {!hideWelcome && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Watch the Welcome Video</h2>
            <Button variant="ghost" size="sm" onClick={dismissWelcome}>
              <EyeOff className="w-4 h-4 mr-1" /> Hide
            </Button>
          </div>
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
          <p className="text-muted-foreground">
            See the following where you can add your guests, chat with others, choose what to volunteer for, etc. If you have any issues with the platform, please screenshot it and text it to 808.278.7562.
          </p>
        </div>
      )}

      {hideWelcome && (
        <Button variant="outline" size="sm" onClick={showWelcome}>
          Show welcome video
        </Button>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-ink" />
            <h2 className="font-semibold">My guests ({myGuests.length})</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/invitations/new">
              <UserPlus className="w-4 h-4 mr-2" /> Add guest
            </Link>
          </Button>
        </div>
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          Guests you've invited. If someone texts you back to decline (or accept), record their RSVP here.
        </p>
        {loadingGuests ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your guests…
          </div>
        ) : myGuests.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            You haven't invited anyone yet.
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[420px] overflow-auto">
            {myGuests.map((guest) => (
              <div key={guest.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <p className="font-medium">{guest.guest_name}</p>
                  {guest.guest_phone && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Phone className="w-3 h-3" /> {guest.guest_phone}
                    </span>
                  )}
                </div>
                <RsvpStatusBadge status={guest.rsvp_status} />
                {!guest.rsvp_status && (
                  <Select
                    value=""
                    disabled={settingRsvpId === guest.id}
                    onValueChange={(v) =>
                      void setRsvpFor(guest, v as "yes1" | "yes2" | "yes3" | "yes4" | "no" | "clear")
                    }
                  >
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue placeholder={settingRsvpId === guest.id ? "Saving…" : "Record RSVP"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No / declined</SelectItem>
                      <SelectItem value="yes1">Yes — 1 person</SelectItem>
                      <SelectItem value="yes2">Yes — 2 people</SelectItem>
                      <SelectItem value="yes3">Yes — 3 people</SelectItem>
                      <SelectItem value="yes4">Yes — 4 people</SelectItem>
                      <SelectItem value="clear">Clear RSVP</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <CollapsibleSection
        open={openSection === "confirmed"}
        onToggle={() => toggleSection("confirmed")}
        icon={<CheckCircle2 className="w-5 h-5 text-terracotta" />}
        title={`Confirmed RSVPs (${confirmedPeople} people / ${confirmedGuests.length} responses)`}
        cardClassName="border-terracotta/40 bg-terracotta/5"
      >
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
      </CollapsibleSection>

      <CollapsibleSection
        open={openSection === "all"}
        onToggle={() => toggleSection("all")}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        title={`Guest list (${guests.length})`}
        action={
          <Button asChild variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
            <Link to="/admin/upload" search={{ view: "committee" }}>
              <Upload className="w-4 h-4 mr-2" /> Add guests
            </Link>
          </Button>
        }
      >
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
      </CollapsibleSection>

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

function CollapsibleSection({
  open,
  onToggle,
  icon,
  title,
  action,
  cardClassName,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  cardClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`overflow-hidden ${cardClassName ?? ""}`}>
      <Collapsible open={open} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full p-4 border-b border-border flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {icon}
              <h2 className="font-semibold truncate">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {action}
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Collapsible>
    </Card>
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
