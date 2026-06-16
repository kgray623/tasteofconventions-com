import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarCog, CheckCircle2, ChevronDown, Clock, EyeOff, ListChecks, Loader2, MessageCircle, MessageSquare, Pencil, Phone, Trash2, Upload, UserPlus, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { CategoryChat } from "@/components/CategoryChat";
import { RsvpTotalsCard } from "@/components/rsvp-totals-card";
import { toast } from "sonner";
import { NewBadge } from "@/components/new-badge";
import { markSeen } from "@/lib/whats-new";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type CommitteeGuest = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  rsvp_status: string | null;
  party_size: number;
  attendance_mode: string | null;
  invited_by: string | null;
  host_id: string;
};

const WELCOME_HIDE_KEY = "toc.committee.welcomeVideoHidden";

export function CommitteeWorkspace() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const unread = useChatUnread();
  const search = useSearch({ strict: false }) as { chat?: string };
  const navigate = useNavigate();
  const chatsCardRef = useRef<HTMLDivElement>(null);
  const [guests, setGuests] = useState<CommitteeGuest[]>([]);
  const [myHostIds, setMyHostIds] = useState<string[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [settingRsvpId, setSettingRsvpId] = useState<string | null>(null);
  const [hideWelcome, setHideWelcome] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("my");
  const [myCats, setMyCats] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [committeeNames, setCommitteeNames] = useState<Set<string>>(new Set());
  const [committeePhones, setCommitteePhones] = useState<Set<string>>(new Set());
  const [myGuestsFilter, setMyGuestsFilter] = useState<"all" | "committee">("all");
  const handledChatParamRef = useRef<string | null>(null);

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
        .select("id,guest_name,guest_phone,guest_email,host_id,rsvps(status,party_size,attendance_mode)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as {
        id: string;
        guest_name: string;
        guest_phone: string | null;
        guest_email: string | null;
        host_id: string;
        rsvps:
          | { status: string; party_size: number | null; attendance_mode: string | null }[]
          | { status: string; party_size: number | null; attendance_mode: string | null }
          | null;
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
            guest_email: row.guest_email,
            rsvp_status: rsvp?.status ?? null,
            party_size: rsvp?.party_size ?? 1,
            attendance_mode: rsvp?.attendance_mode ?? null,
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

  // Load the full committee roster from all three sources and index by
  // normalized name + last-10-digit phone so we can tag guests consistently.
  useEffect(() => {
    let alive = true;
    (async () => {
      const normName = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
      const normTail = (s: string | null) => {
        const d = (s ?? "").replace(/\D/g, "");
        return d.length >= 10 ? d.slice(-10) : "";
      };
      const names = new Set<string>();
      const phones = new Set<string>();
      const push = (name: string | null, phone: string | null) => {
        const n = normName(name);
        if (n.length >= 2) names.add(n);
        const p = normTail(phone);
        if (p) phones.add(p);
      };
      try {
        const [inviters, teamInvites, committeeInvs] = await Promise.all([
          supabase.from("inviters").select("name,phone").eq("active", true),
          supabase.from("team_invites").select("name,phone,phone_normalized").eq("role", "team"),
          supabase.from("invitations").select("guest_name,guest_phone,guest_phone_normalized").eq("is_committee", true),
        ]);
        for (const r of (inviters.data ?? []) as { name: string | null; phone: string | null }[]) {
          push(r.name, r.phone);
        }
        for (const r of (teamInvites.data ?? []) as { name: string | null; phone: string | null; phone_normalized: string | null }[]) {
          push(r.name, r.phone_normalized || r.phone);
        }
        for (const r of (committeeInvs.data ?? []) as { guest_name: string | null; guest_phone: string | null; guest_phone_normalized: string | null }[]) {
          push(r.guest_name, r.guest_phone_normalized || r.guest_phone);
        }
      } catch (e) {
        console.warn("[committee] committee roster load failed", e);
      }
      if (!alive) return;
      setCommitteeNames(names);
      setCommitteePhones(phones);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!user) {
      setMyCats([]);
      return;
    }
    let alive = true;
    const loadMyCats = async () => {
      const { data, error } = await supabase
        .from("category_assignments")
        .select("category_id, categories(id, name, description)")
        .eq("user_id", user.id);
      if (error || !alive) return;
      const rows = (data ?? []) as unknown as { categories: { id: string; name: string; description: string | null } | null }[];
      const cats = rows
        .map((r) => r.categories)
        .filter((c): c is { id: string; name: string; description: string | null } => !!c)
        .sort((a, b) => a.name.localeCompare(b.name));
      setMyCats(cats);
    };
    void loadMyCats();
    const ch = supabase
      .channel(`my-category-assignments:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "category_assignments", filter: `user_id=eq.${user.id}` },
        () => void loadMyCats(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  // Load profile display names for chat author labels
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("id,display_name,email");
      if (!alive) return;
      const map: Record<string, string> = {};
      for (const p of (data ?? []) as { id: string; display_name: string | null; email: string | null }[]) {
        map[p.id] = (p.display_name ?? "").trim() || (p.email ?? "").split("@")[0] || "Member";
      }
      setProfileNames(map);
    })();
    return () => { alive = false; };
  }, []);

  // Deep-link from notifications: ?chat=<categoryId>
  useEffect(() => {
    const chatId = search.chat;
    if (!chatId || handledChatParamRef.current === chatId) return;
    if (myCats.length === 0) return; // wait until assignments load
    handledChatParamRef.current = chatId;
    // Scroll the My volunteer chats card into view
    setTimeout(() => {
      chatsCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    // Open the modal if the user is in that category
    if (myCats.some((c) => c.id === chatId)) {
      setOpenChatId(chatId);
    }
    // Clear the param so refresh/back doesn't keep reopening
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, chat: undefined }), replace: true });
  }, [search.chat, myCats, navigate]);



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

  const deleteGuest = async (guest: CommitteeGuest) => {
    const { error } = await supabase.from("invitations").delete().eq("id", guest.id);
    if (error) {
      toast.error(`Couldn't delete: ${error.message}`);
      return;
    }
    toast.success(`Deleted ${guest.guest_name}.`);
    await loadGuests();
  };

  const saveGuestEdits = async (
    guest: CommitteeGuest,
    edits: { guest_name: string; guest_phone: string; guest_email: string },
  ) => {
    const { error } = await supabase
      .from("invitations")
      .update({
        guest_name: edits.guest_name.trim(),
        guest_phone: edits.guest_phone.trim() || null,
        guest_email: edits.guest_email.trim() || null,
      })
      .eq("id", guest.id);
    if (error) {
      toast.error(`Couldn't save: ${error.message}`);
      return false;
    }
    toast.success(`Updated ${edits.guest_name.trim() || guest.guest_name}.`);
    await loadGuests();
    return true;
  };

  const mineHostIdSet = new Set(myHostIds.length ? myHostIds : user ? [user.id] : []);
  const myGuestsUnsorted = user ? guests.filter((g) => mineHostIdSet.has(g.host_id)) : [];

  // Detect duplicates among my guests (same normalized name OR same last-10-digit phone)
  const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const normPhoneTail = (s: string | null) => {
    const d = (s ?? "").replace(/\D/g, "");
    return d.length >= 10 ? d.slice(-10) : "";
  };
  const nameBuckets = new Map<string, string[]>();
  const phoneBuckets = new Map<string, string[]>();
  for (const g of myGuestsUnsorted) {
    const n = normName(g.guest_name);
    if (n.length >= 2) {
      if (!nameBuckets.has(n)) nameBuckets.set(n, []);
      nameBuckets.get(n)!.push(g.id);
    }
    const p = normPhoneTail(g.guest_phone);
    if (p) {
      if (!phoneBuckets.has(p)) phoneBuckets.set(p, []);
      phoneBuckets.get(p)!.push(g.id);
    }
  }
  const duplicateIds = new Set<string>();
  for (const ids of nameBuckets.values()) if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));
  for (const ids of phoneBuckets.values()) if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));

  // Sort: pending first → yes → no → other; alphabetical within each bucket
  const statusRank = (status: string | null) => {
    if (!status) return 0;
    if (status === "yes") return 1;
    if (status === "no") return 2;
    return 3;
  };
  const isCommitteeGuest = (g: CommitteeGuest) => {
    const n = normName(g.guest_name);
    if (n && committeeNames.has(n)) return true;
    const p = normPhoneTail(g.guest_phone);
    if (p && committeePhones.has(p)) return true;
    return false;
  };
  const committeeIds = new Set(myGuestsUnsorted.filter(isCommitteeGuest).map((g) => g.id));

  const myGuestsSorted = [...myGuestsUnsorted].sort((a, b) => {
    const r = statusRank(a.rsvp_status) - statusRank(b.rsvp_status);
    if (r !== 0) return r;
    return a.guest_name.trim().toLowerCase().localeCompare(b.guest_name.trim().toLowerCase());
  });
  const myGuests = myGuestsFilter === "committee"
    ? myGuestsSorted.filter((g) => committeeIds.has(g.id))
    : myGuestsSorted;

  const confirmedGuests = guests.filter((guest) => guest.rsvp_status === "yes");
  const confirmedInPersonGuests = confirmedGuests.filter((g) => g.attendance_mode !== "zoom");
  const confirmedVirtualGuests = confirmedGuests.filter((g) => g.attendance_mode === "zoom");
  const confirmedInPersonPeople = confirmedInPersonGuests.reduce((t, g) => t + g.party_size, 0);
  const confirmedVirtualPeople = confirmedVirtualGuests.reduce((t, g) => t + g.party_size, 0);


  const toggleSection = (key: string) => setOpenSection((prev) => (prev === key ? null : key));

  return (
    <div className="space-y-6">
      {!hideWelcome && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Watch the Welcome Video</h2>
            <div className="flex items-center gap-2">
              <NewBadge target="committee:hide-welcome-video" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  markSeen("committee:hide-welcome-video");
                  dismissWelcome();
                }}
              >
                <EyeOff className="w-4 h-4 mr-1" /> Hide
              </Button>
            </div>
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

      <RsvpTotalsCard personalHostIds={myHostIds.length ? myHostIds : user ? [user.id] : []} />

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-ink" />
            <h2 className="font-semibold">My Guests Uploaded ({myGuests.length}{myGuestsFilter === "committee" ? ` of ${myGuestsSorted.length}` : ""})</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/invitations/new">
              <UserPlus className="w-4 h-4 mr-2" /> Add guest
            </Link>
          </Button>
        </div>
        <div className="px-4 pt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={myGuestsFilter === "all" ? "default" : "outline"}
            onClick={() => setMyGuestsFilter("all")}
          >
            All ({myGuestsSorted.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={myGuestsFilter === "committee" ? "default" : "outline"}
            onClick={() => setMyGuestsFilter("committee")}
          >
            Committee ({committeeIds.size})
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{guest.guest_name}</p>
                    {isCommitteeGuest(guest) && (
                      <span className="inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">
                        Committee
                      </span>
                    )}
                    {duplicateIds.has(guest.id) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        <AlertTriangle className="w-3 h-3" /> Duplicate
                      </span>
                    )}
                  </div>
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
                <EditGuestButton guest={guest} onSave={saveGuestEdits} />
                <DeleteGuestButton guest={guest} onDelete={deleteGuest} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <CollapsibleSection
        open={openSection === "confirmed"}
        onToggle={() => toggleSection("confirmed")}
        icon={<CheckCircle2 className="w-5 h-5 text-terracotta" />}
        title={`Confirmed RSVPs (${confirmedInPersonPeople} in person · ${confirmedVirtualPeople} virtual / ${confirmedGuests.length} responses)`}
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
            {confirmedGuests.map((guest) => {
              const isVirtual = guest.attendance_mode === "zoom";
              return (
                <div key={guest.id} className="p-4 flex flex-wrap items-center gap-3 text-sm">
                  <p className="font-medium flex-1 min-w-[160px]">
                    {guest.guest_name}
                    {isCommitteeGuest(guest) && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream align-middle">
                        Committee
                      </span>
                    )}
                  </p>
                  <Badge
                    className={
                      isVirtual
                        ? "bg-ink/10 text-ink hover:bg-ink/10"
                        : "bg-gold text-ink hover:bg-gold"
                    }
                  >
                    {guest.party_size} {isVirtual ? "virtual" : "in person"}
                  </Badge>
                  {guest.invited_by && (
                    <span className="text-muted-foreground">Invited by {guest.invited_by}</span>
                  )}
                </div>
              );
            })}
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

      <Card ref={chatsCardRef} className="overflow-hidden scroll-mt-20">

        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-terracotta" />
            <h2 className="font-semibold">My volunteer chats ({myCats.length})</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/categories" search={{ view: "committee" }}>
              <ListChecks className="w-4 h-4 mr-2" /> Volunteer
            </Link>
          </Button>
        </div>
        {myCats.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            You haven't signed up for any volunteer opportunities yet. Tap{" "}
            <Link to="/admin/categories" search={{ view: "committee" }} className="underline text-terracotta">
              Volunteer
            </Link>{" "}
            to choose one — its chat will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {myCats.map((c) => {
              const u = unread.categories.find((x) => x.category_id === c.id);
              const count = u?.count ?? 0;
              return (
                <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{c.name}</p>
                      {count > 0 && (
                        <Badge className="bg-terracotta text-cream hover:bg-terracotta text-[10px]">
                          {count} new
                        </Badge>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenChatId(c.id)}
                    className="shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> Open chat
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {myCats.map((c) => (
        <CategoryChat
          key={`chat-${c.id}`}
          open={openChatId === c.id}
          onOpenChange={(v) => setOpenChatId(v ? c.id : null)}
          categoryId={c.id}
          categoryName={c.name}
          canChat={true}
          isAdmin={isAdmin}
          nameFor={(uid) => profileNames[uid] ?? "Member"}
        />
      ))}

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

function EditGuestButton({
  guest,
  onSave,
}: {
  guest: CommitteeGuest;
  onSave: (
    guest: CommitteeGuest,
    edits: { guest_name: string; guest_phone: string; guest_email: string },
  ) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(guest.guest_name);
  const [phone, setPhone] = useState(guest.guest_phone ?? "");
  const [email, setEmail] = useState(guest.guest_email ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(guest.guest_name);
      setPhone(guest.guest_phone ?? "");
      setEmail(guest.guest_email ?? "");
    }
  }, [open, guest]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    const ok = await onSave(guest, { guest_name: name, guest_phone: phone, guest_email: email });
    setSaving(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-ink"
          aria-label={`Edit ${guest.guest_name}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit guest</DialogTitle>
          <DialogDescription>Update {guest.guest_name}'s contact info.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="edit-guest-name">Name</Label>
            <Input id="edit-guest-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-guest-phone">Phone</Label>
            <Input id="edit-guest-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-guest-email">Email</Label>
            <Input id="edit-guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGuestButton({
  guest,
  onDelete,
}: {
  guest: CommitteeGuest;
  onDelete: (guest: CommitteeGuest) => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label={`Delete ${guest.guest_name}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this guest?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{guest.guest_name}</strong>
            {guest.guest_phone ? ` (${guest.guest_phone})` : ""} and any RSVP they've made. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void onDelete(guest)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
