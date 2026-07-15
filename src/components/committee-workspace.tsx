import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarCog, CheckCircle2, ChevronDown, Clock, EyeOff, ListChecks, Loader2, MessageCircle, MessageSquare, Pencil, Phone, RefreshCw, Trash2, Upload, UserPlus, Utensils } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAdminView } from "@/hooks/use-admin-view";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { CategoryChat } from "@/components/CategoryChat";
import { RsvpTotalsCard } from "@/components/rsvp-totals-card";
import { toast } from "sonner";
import { NewBadge } from "@/components/new-badge";
import { markSeen } from "@/lib/whats-new";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";
import { getCommitteeWorkspaceGuests, type CommitteeWorkspaceGuest } from "@/lib/rsvp-totals.functions";
import { buildDuplicateGroupIds, computeRsvpRollup, formatPeopleResponses } from "@/lib/rsvp-math";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type CommitteeGuest = CommitteeWorkspaceGuest;
type PendingSortMode = "alpha" | "newest" | "oldest";
type RsvpAction =
  | "inperson1"
  | "inperson2"
  | "inperson3"
  | "inperson4"
  | "zoom1"
  | "zoom2"
  | "zoom3"
  | "zoom4"
  | "no"
  | "clear";

const WELCOME_HIDE_KEY = "toc.committee.welcomeVideoHidden";
const LOAD_TIMEOUT_MS = 12_000;

const pickSingleRsvp = (
  rsvps:
    | { status: string | null; party_size: number | null; attendance_mode: string | null; responded_at: string | null }[]
    | { status: string | null; party_size: number | null; attendance_mode: string | null; responded_at: string | null }
    | null,
) => (Array.isArray(rsvps) ? rsvps[0] : rsvps) ?? null;

export function CommitteeWorkspace() {
  const { user } = useAuth();
  const { isAdmin } = useAdminView();
  const unread = useChatUnread();
  const fetchCommitteeGuests = useServerFn(getCommitteeWorkspaceGuests);
  const search = useSearch({ strict: false }) as { chat?: string; pendingSort?: string };
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
  const [openMyGroup, setOpenMyGroup] = useState<{ inPerson: boolean; zoom: boolean; declined: boolean; pending: boolean }>({ inPerson: false, zoom: false, declined: false, pending: true });
  const [openTotals, setOpenTotals] = useState(true);
  const [openMyGuestsCard, setOpenMyGuestsCard] = useState(true);

  const [lastSeenYesAt, setLastSeenYesAt] = useState<number | null>(null);
  const [manualRefreshingGuests, setManualRefreshingGuests] = useState(false);
  const [markingSentId, setMarkingSentId] = useState<string | null>(null);
  const handledChatParamRef = useRef<string | null>(null);
  const loadingGuestsRef = useRef(false);
  const activePendingSort: PendingSortMode =
    search.pendingSort === "newest" || search.pendingSort === "oldest" || search.pendingSort === "alpha"
      ? search.pendingSort
      : "alpha";

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
    // NOTE: do NOT early-return when loadingGuestsRef is already true.
    // React StrictMode runs effects twice in dev; the early-return + cleanup
    // race caused the spinner to hang forever. `alive()` is the real guard
    // against stale state writes from a superseded run.
    loadingGuestsRef.current = true;
    if (alive()) setLoadingGuests(true);
    try {
      // Wait for the Supabase session to hydrate before calling the
      // authenticated server fn — otherwise attachSupabaseAuth sends no
      // bearer and the middleware 401s ("No authorization header provided").
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) break;
        await new Promise((r) => setTimeout(r, 200));
        if (!alive()) return;
      }
      const result = await withTimeout(fetchCommitteeGuests({ data: {} }), LOAD_TIMEOUT_MS);

      if (!alive()) return;
      setMyHostIds(result.myHostIds);
      setGuests(result.guests);
    } catch (error) {
      console.error("[committee] guest list load failed", error);
      try {
        const fallback = await loadGuestsFromBrowser();
        if (!alive()) return;
        setMyHostIds(fallback.myHostIds);
        setGuests(fallback.guests);
      } catch (fallbackError) {
        console.error("[committee] browser guest list fallback failed", fallbackError);
        if (alive()) toast.error(getErrorMessage(fallbackError, getErrorMessage(error, "Guest list refresh timed out. Try again.")));
        if (alive()) setGuests([]);
      }
    } finally {
      if (alive()) setLoadingGuests(false);
      loadingGuestsRef.current = false;
    }
  };

  const loadGuestsFromBrowser = async () => {
    const mineSet = new Set<string>();
    if (user?.id) mineSet.add(user.id);

    const userPhone: string | undefined =
      (user as { phone?: string } | null)?.phone ||
      ((user?.user_metadata as { phone?: string } | undefined)?.phone ?? undefined);
    const tail10 = (userPhone ?? "").replace(/\D/g, "").slice(-10);
    let myName = "";
    if (user?.id) {
      const { data: prof } = await withTimeout(
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        LOAD_TIMEOUT_MS,
      );
      myName = (prof?.display_name ?? "").trim().toLowerCase();
    }

    const { data: inviterRows, error: inviterError } = await withTimeout(
      supabase.from("inviters").select("host_id,phone,name"),
      LOAD_TIMEOUT_MS,
    );
    if (inviterError) throw inviterError;
    for (const row of inviterRows ?? []) {
      if (!row.host_id) continue;
      const rowTail = (row.phone ?? "").replace(/\D/g, "").slice(-10);
      const rowName = (row.name ?? "").trim().toLowerCase();
      if (row.host_id === user?.id || (tail10 && rowTail === tail10) || (myName && rowName === myName)) {
        mineSet.add(row.host_id);
      }
    }

    const { data: events, error: eventsError } = await withTimeout(
      supabase.from("events").select("id").order("starts_at").limit(1),
      LOAD_TIMEOUT_MS,
    );
    if (eventsError) throw eventsError;
    const eventId = events?.[0]?.id;
    if (!eventId) return { guests: [], myHostIds: Array.from(mineSet) };

    const { data, error: invitationsError } = await withTimeout(
      supabase
        .from("invitations")
          .select("id,created_at,invite_sent_at,guest_name,guest_phone,host_id,rsvp_token,rsvps(status,party_size,attendance_mode,responded_at)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      LOAD_TIMEOUT_MS,
    );
    if (invitationsError) throw invitationsError;

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      created_at: string | null;
      invite_sent_at: string | null;
      guest_name: string;
      guest_phone: string | null;
      host_id: string;
      rsvp_token: string | null;
      rsvps:
        | { status: string | null; party_size: number | null; attendance_mode: string | null; responded_at: string | null }[]
        | { status: string | null; party_size: number | null; attendance_mode: string | null; responded_at: string | null }
        | null;
    }>;

    const hostIds = Array.from(new Set(rows.map((r) => r.host_id).filter(Boolean)));
    const hostNames = new Map<string, string>();
    if (hostIds.length) {
      const { data: profiles, error: profilesError } = await withTimeout(
        supabase.from("profiles").select("id,display_name").in("id", hostIds),
        LOAD_TIMEOUT_MS,
      );
      if (profilesError) throw profilesError;
      for (const profile of profiles ?? []) {
        const name = (profile.display_name ?? "").trim();
        if (name) hostNames.set(profile.id, name);
      }
    }

    return {
      myHostIds: Array.from(mineSet),
      guests: rows.map((row) => {
        const rsvp = pickSingleRsvp(row.rsvps);
        return {
          id: row.id,
          created_at: row.created_at ?? null,
          invite_sent_at: row.invite_sent_at ?? null,
          guest_name: row.guest_name,
          guest_phone: row.guest_phone,
          rsvp_status: rsvp?.status ?? null,
          party_size: rsvp?.party_size ?? 1,
          attendance_mode: rsvp?.attendance_mode ?? null,
          responded_at: rsvp?.responded_at ?? null,
          invited_by: hostNames.get(row.host_id) ?? null,
          host_id: row.host_id,
          rsvp_token: row.rsvp_token ?? null,
        };
      }),
    };
  };

  useEffect(() => {
    let alive = true;
    void loadGuests(() => alive);
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const refreshGuestsNow = async () => {
    if (manualRefreshingGuests) return;
    loadingGuestsRef.current = false;
    setManualRefreshingGuests(true);
    try {
      await loadGuests();
    } finally {
      setManualRefreshingGuests(false);
    }
  };

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
    return () => {
      alive = false;
    };
  }, [user]);

  // Load profile display names for chat author labels
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("id,display_name");
      if (!alive) return;
      const map: Record<string, string> = {};
      for (const p of (data ?? []) as { id: string; display_name: string | null }[]) {
        map[p.id] = (p.display_name ?? "").trim() || "Member";
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
    value: RsvpAction,
  ) => {
    setSettingRsvpId(guest.id);
    try {
      if (value === "clear") {
        const { error } = await supabase.from("rsvps").delete().eq("invitation_id", guest.id);
        if (error) throw error;
        toast.success(`Cleared RSVP for ${guest.guest_name}.`);
      } else {
        const status = value === "no" ? "no" : "yes";
        const attendanceMode = value.startsWith("zoom") ? "zoom" : "in_person";
        const partySize = value === "no" ? 1 : Number(value.replace("inperson", "").replace("zoom", ""));
        const { error } = await supabase.from("rsvps").upsert(
          {
            invitation_id: guest.id,
            status,
            party_size: partySize,
            attendance_mode: attendanceMode,
            responded_at: new Date().toISOString(),
          },
          { onConflict: "invitation_id" },
        );
        if (error) throw error;
        toast.success(
          status === "no"
            ? `Marked ${guest.guest_name} as declined.`
            : `Marked ${guest.guest_name} attending ${attendanceMode === "zoom" ? "by Zoom" : "in person"} (${partySize}).`,
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
    edits: { guest_name: string; guest_phone: string },
  ) => {
    const { error } = await supabase
      .from("invitations")
      .update({
        guest_name: edits.guest_name.trim(),
        guest_phone: edits.guest_phone.trim() || null,
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

  const toggleSent = async (guest: CommitteeGuest, checked: boolean) => {
    setMarkingSentId(guest.id);
    const sentAt = checked ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("invitations")
      .update({ invite_sent_at: sentAt })
      .eq("id", guest.id);
    setMarkingSentId(null);
    if (error) {
      toast.error("Couldn't update sent text", { description: error.message });
      return;
    }
    setGuests((prev) => prev.map((row) => (row.id === guest.id ? { ...row, invite_sent_at: sentAt } : row)));
    toast.success(checked ? "Marked text as sent." : "Marked text as not sent.");
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

  // Single shared alphabetical comparator — every list on this dashboard uses it.
  const byName = (a: CommitteeGuest, b: CommitteeGuest) =>
    (a.guest_name ?? "").trim().toLowerCase().localeCompare(
      (b.guest_name ?? "").trim().toLowerCase(),
      undefined,
      { sensitivity: "base" },
    );
  const byPendingSort = (a: CommitteeGuest, b: CommitteeGuest) => {
    if (activePendingSort === "newest" || activePendingSort === "oldest") {
      const at = a.created_at ? Date.parse(a.created_at) : 0;
      const bt = b.created_at ? Date.parse(b.created_at) : 0;
      if (at !== bt) return activePendingSort === "newest" ? bt - at : at - bt;
    }
    return byName(a, b);
  };
  const isCommitteeGuest = (g: CommitteeGuest) => {
    const n = normName(g.guest_name);
    if (n && committeeNames.has(n)) return true;
    const p = normPhoneTail(g.guest_phone);
    if (p && committeePhones.has(p)) return true;
    return false;
  };
  const committeeIds = new Set(myGuestsUnsorted.filter(isCommitteeGuest).map((g) => g.id));

  const myGuestsSorted = [...myGuestsUnsorted].sort(byName);
  const myGuests = myGuestsFilter === "committee"
    ? myGuestsSorted.filter((g) => committeeIds.has(g.id))
    : myGuestsSorted;

  const myGuestGroupIds = buildDuplicateGroupIds(myGuests.map((g) => ({
    id: g.id,
    guest_name: g.guest_name,
    guest_phone: g.guest_phone,
  })));
  const myGuestRollup = computeRsvpRollup(myGuests.map((g) => ({
    id: g.id,
    groupId: myGuestGroupIds.get(g.id) ?? g.id,
    status: g.rsvp_status,
    party_size: g.party_size,
    attendance_mode: g.attendance_mode,
  })));

  const confirmedGuests = [...myGuests].filter((g) => g.rsvp_status === "yes").sort(byName);
  const confirmedInPersonPeople = myGuestRollup.people.inPerson;
  const confirmedVirtualPeople = myGuestRollup.people.zoom;
  const confirmedResponseCount = myGuestRollup.responses.confirmed;
  const inPersonResponseCount = myGuestRollup.responses.inPerson;
  const zoomResponseCount = myGuestRollup.responses.zoom;
  const declinedPeople = myGuestRollup.people.declined;
  const declinedResponseCount = myGuestRollup.responses.declined;
  const pendingPeople = myGuestRollup.people.pending;
  const pendingResponseCount = myGuestRollup.responses.pending;

  // Group "My Guests" by RSVP status, alphabetized within each group.
  const myInPerson = myGuests
    .filter((g) => g.rsvp_status === "yes" && g.attendance_mode !== "zoom")
    .sort(byName);
  const myZoom = myGuests
    .filter((g) => g.rsvp_status === "yes" && g.attendance_mode === "zoom")
    .sort(byName);
  const myPending = myGuests
    .filter((g) => !g.rsvp_status || g.rsvp_status === "waitlist" || g.rsvp_status === "maybe")
    .sort(byPendingSort);
  const myDeclined = myGuests.filter((g) => g.rsvp_status === "no").sort(byName);

  const pendingSortControl = (
    <div className="flex flex-wrap items-center gap-2 pt-3">
      <span className="text-xs font-medium text-muted-foreground">Pending order</span>
      <Select
        value={activePendingSort}
        onValueChange={(value) =>
          navigate({
            to: ".",
            search: (prev: Record<string, unknown>) => ({
              ...prev,
              pendingSort: value === "alpha" ? undefined : (value as PendingSortMode),
            }),
          })
        }
      >
        <SelectTrigger className="h-8 w-[150px] bg-background text-xs" aria-label="Sort pending guests">
          <SelectValue placeholder="Sort pending" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alpha">Alphabetical</SelectItem>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  // Build a sms: link for the phone's Messages app. Same wording as the
  // Upload page's Send SMS button so committee members send a consistent
  // invitation whether they text from the pending list or the upload page.
  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://tasteofconventions.com";
  const senderName =
    (myGuestsUnsorted.find((g) => g.host_id === user?.id)?.invited_by ?? "").trim() ||
    (((user?.user_metadata as { full_name?: string; name?: string; display_name?: string } | undefined)?.full_name ??
      (user?.user_metadata as { name?: string } | undefined)?.name ??
      (user?.user_metadata as { display_name?: string } | undefined)?.display_name ??
      "") as string).trim() ||
    "your friend";
  const rsvpLinkToken = (token: string) =>
    encodeURIComponent(token.trim().replace(/\+/g, "-").replace(/\//g, "_"));
  const buildSmsInfo = (
    guest: CommitteeGuest,
  ): { phone: string; body: string } | null => {
    if (!guest.guest_phone || !guest.rsvp_token) return null;
    const firstName = (guest.guest_name || "Friend").split(/\s+/)[0];
    const senderFirst = senderName.split(/\s+/)[0];
    const link = `${siteOrigin}/rsvp/${rsvpLinkToken(guest.rsvp_token)}`;
    const body = `Hi ${firstName}, it's ${senderFirst}. You're invited to A Taste of Special Conventions on Sunday, August 30, 2026. Please RSVP here: ${link}`;
    return { phone: guest.guest_phone, body };
  };

  // "New guests RSVP'd" since user last acknowledged.
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(`toc.committee.lastSeenYes:${user.id}`);
    setLastSeenYesAt(raw ? Number(raw) || 0 : 0);
  }, [user]);
  const newYesGuests = lastSeenYesAt === null
    ? []
    : myGuestsUnsorted
        .filter(
          (g) =>
            g.rsvp_status === "yes" &&
            g.responded_at &&
            new Date(g.responded_at).getTime() > lastSeenYesAt,
        )
        .sort(byName);
  const newYesGroupIds = buildDuplicateGroupIds(newYesGuests.map((g) => ({
    id: g.id,
    guest_name: g.guest_name,
    guest_phone: g.guest_phone,
  })));
  const newYesRollup = computeRsvpRollup(newYesGuests.map((g) => ({
    id: g.id,
    groupId: newYesGroupIds.get(g.id) ?? g.id,
    status: g.rsvp_status,
    party_size: g.party_size,
    attendance_mode: g.attendance_mode,
  })));
  const newYesPeople = newYesRollup.people.confirmed;
  const newYesResponses = newYesRollup.responses.confirmed;
  const markYesSeen = () => {
    if (!user || typeof window === "undefined") return;
    const now = Date.now();
    window.localStorage.setItem(`toc.committee.lastSeenYes:${user.id}`, String(now));
    setLastSeenYesAt(now);
  };

  const toggleSection = (key: string) => setOpenSection((prev) => (prev === key ? null : key));



  return (
    <div className="space-y-6">

      <Button asChild className="sticky top-3 z-20 w-full bg-terracotta text-cream hover:bg-terracotta/90 justify-center h-14 text-base shadow-lg">
        <Link to="/admin/upload" search={{ view: "committee" }}>
          <Upload className="w-4 h-4" /> Upload guest list
        </Link>
      </Button>


      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild className="bg-ink text-cream hover:bg-ink/90 justify-start h-14">
          <Link to="/admin/categories" search={{ view: "committee" }}>
            <ListChecks className="w-4 h-4" /> Volunteer
          </Link>
        </Button>


        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/chat" search={{ view: "committee" }}>
            <MessageSquare className="w-4 h-4" /> Committee chat
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-14">
          <a href="/#datetime" target="_blank" rel="noopener noreferrer">
            <CalendarCog className="w-4 h-4" /> Event details
          </a>
        </Button>
        {isAdmin && (
          <Button asChild variant="outline" className="justify-start h-14">
            <Link to="/admin/team" search={{ view: "committee" }}>
              <UserPlus className="w-4 h-4" /> Add committee member
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="justify-start h-14">
          <Link to="/admin/preorders" search={{ view: "committee" }}>
            <Utensils className="w-4 h-4" /> Food report
          </Link>
        </Button>
      </div>

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

      <Card className="overflow-hidden border-terracotta/30">
        <Collapsible open={openTotals} onOpenChange={() => setOpenTotals((v) => !v)}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/40"
            >
              <span className="flex items-center gap-2 font-semibold">
                <ListChecks className="w-5 h-5 text-terracotta" /> RSVP totals
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openTotals ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0">
              <RsvpTotalsCard personalHostIds={myHostIds.length ? myHostIds : user ? [user.id] : []} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="overflow-hidden">
        <Collapsible open={openMyGuestsCard} onOpenChange={() => setOpenMyGuestsCard((v) => !v)}>
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 flex-wrap text-left hover:bg-muted/40 rounded-md">
              <CheckCircle2 className="w-5 h-5 text-ink shrink-0" />
              <h2 className="font-semibold truncate">My Guests ({loadingGuests ? "…" : `${myGuests.length}${myGuestsFilter === "committee" ? ` of ${myGuestsSorted.length}` : ""}`})</h2>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openMyGuestsCard ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); void refreshGuestsNow(); }}
              disabled={manualRefreshingGuests || loadingGuests}
              aria-label="Refresh guest list"
            >
              {manualRefreshingGuests ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <CollapsibleContent>

        {newYesGuests.length > 0 && (
          <div className="mx-4 mt-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <NewBadge target="committee:new-yes-rsvps" />
              <span className="font-semibold text-emerald-900">
                {newYesPeople} new guest{newYesPeople === 1 ? "" : "s"} RSVP'd
                {newYesPeople !== newYesResponses && ` (across ${newYesResponses} response${newYesResponses === 1 ? "" : "s"})`}:
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={markYesSeen}
              >
                Mark seen
              </Button>
            </div>
            <ul className="text-emerald-900 text-xs space-y-0.5 pl-1">
              {newYesGuests.map((g) => {
                const mode = g.attendance_mode === "zoom" ? "Zoom" : "in person";
                return (
                  <li key={g.id}>
                    <span className="font-medium">{g.guest_name}</span> — {g.party_size || 1} {mode}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="px-4 pt-3 flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={myGuestsFilter === "all" ? "default" : "outline"}
            onClick={() => setMyGuestsFilter("all")}
          >
            All ({loadingGuests ? "…" : myGuestsSorted.length})
          </Button>
          <NewBadge target="committee:filter-toggle" />
          <Button
            type="button"
            size="sm"
            variant={myGuestsFilter === "committee" ? "default" : "outline"}
            onClick={() => setMyGuestsFilter("committee")}
          >
            Committee ({loadingGuests ? "…" : committeeIds.size})
          </Button>
        </div>
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          Guests you've invited. If someone texts you back to decline (or accept), record their RSVP here.
        </p>
        <p className="px-4 pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <NewBadge target="committee:row-actions" />
          <span>Use the pencil to edit or the trash to delete the guest.</span>
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
          <div className="p-4 space-y-3">
            <MyGuestsGroup
              label="RSVP in person"
              tone="emerald"
              guests={myInPerson}
              peopleCount={confirmedInPersonPeople}
              responseCount={inPersonResponseCount}
              open={openMyGroup.inPerson}
              onToggle={() => setOpenMyGroup((p) => ({ ...p, inPerson: !p.inPerson }))}
              isCommitteeGuest={isCommitteeGuest}
              duplicateIds={duplicateIds}
              settingRsvpId={settingRsvpId}
              setRsvpFor={setRsvpFor}
              saveGuestEdits={saveGuestEdits}
              deleteGuest={deleteGuest}
              buildSmsInfo={buildSmsInfo}
              markingSentId={markingSentId}
              toggleSent={toggleSent}
            />
            <MyGuestsGroup
              label="Pending"
              tone="muted"
              guests={myPending}
              peopleCount={pendingPeople}
              responseCount={pendingResponseCount}
              open={openMyGroup.pending}
              onToggle={() => setOpenMyGroup((p) => ({ ...p, pending: !p.pending }))}
              action={pendingSortControl}
              isCommitteeGuest={isCommitteeGuest}
              duplicateIds={duplicateIds}
              settingRsvpId={settingRsvpId}
              setRsvpFor={setRsvpFor}
              saveGuestEdits={saveGuestEdits}
              deleteGuest={deleteGuest}
              buildSmsInfo={buildSmsInfo}
              markingSentId={markingSentId}
              toggleSent={toggleSent}
            />
            <MyGuestsGroup
              label="RSVP by Zoom"
              tone="muted"
              guests={myZoom}
              peopleCount={confirmedVirtualPeople}
              responseCount={zoomResponseCount}
              open={openMyGroup.zoom}
              onToggle={() => setOpenMyGroup((p) => ({ ...p, zoom: !p.zoom }))}
              isCommitteeGuest={isCommitteeGuest}
              duplicateIds={duplicateIds}
              settingRsvpId={settingRsvpId}
              setRsvpFor={setRsvpFor}
              saveGuestEdits={saveGuestEdits}
              deleteGuest={deleteGuest}
              buildSmsInfo={buildSmsInfo}
              markingSentId={markingSentId}
              toggleSent={toggleSent}
            />
            <MyGuestsGroup
              label="Decline"
              tone="rose"
              guests={myDeclined}
              peopleCount={declinedPeople}
              responseCount={declinedResponseCount}
              open={openMyGroup.declined}
              onToggle={() => setOpenMyGroup((p) => ({ ...p, declined: !p.declined }))}
              isCommitteeGuest={isCommitteeGuest}
              duplicateIds={duplicateIds}
              settingRsvpId={settingRsvpId}
              setRsvpFor={setRsvpFor}
              saveGuestEdits={saveGuestEdits}
              deleteGuest={deleteGuest}
              buildSmsInfo={buildSmsInfo}
              markingSentId={markingSentId}
              toggleSent={toggleSent}
            />
          </div>
        )}
        </CollapsibleContent>
        </Collapsible>
      </Card>


      <CollapsibleSection
        open={openSection === "confirmed"}
        onToggle={() => toggleSection("confirmed")}
        icon={<CheckCircle2 className="w-5 h-5 text-terracotta" />}
        title={loadingGuests ? "My RSVP confirmations (loading…)" : `My RSVP confirmations (${confirmedInPersonPeople} in person · ${confirmedVirtualPeople} Zoom / ${confirmedResponseCount} responses)`}
        cardClassName="border-terracotta/40 bg-terracotta/5"
      >
        {loadingGuests ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading my RSVP confirmations…
          </div>
        ) : confirmedGuests.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">None of your guests have RSVP'd yet.</div>
        ) : (
          <div className="divide-y divide-border md:max-h-[360px] md:overflow-auto">
            {confirmedGuests.map((guest) => {
              const isVirtual = guest.attendance_mode === "zoom";
              const smsInfo = buildSmsInfo(guest);
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
                  <RsvpActionSelect guest={guest} settingRsvpId={settingRsvpId} setRsvpFor={setRsvpFor} />
                  {smsInfo && <SendTextButton guest={guest} info={smsInfo} onSent={toggleSent} />}
                  <SentTextControl guest={guest} markingSentId={markingSentId} onToggleSent={toggleSent} />
                  <EditGuestButton guest={guest} onSave={saveGuestEdits} />
                  <DeleteGuestButton guest={guest} onDelete={deleteGuest} />
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
        title={`My full guest list (${loadingGuests ? "…" : myGuests.length})`}
      >




        {loadingGuests ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading guest list…
          </div>
        ) : myGuests.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">You haven't invited anyone yet.</div>
        ) : (
          <div className="divide-y divide-border md:max-h-[520px] md:overflow-auto">
            {myGuests.map((guest) => {
              const smsInfo = buildSmsInfo(guest);
              return (
              <div key={guest.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium flex-1 min-w-[160px]">
                    {guest.guest_name}
                    {isCommitteeGuest(guest) && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream align-middle">
                        Committee
                      </span>
                    )}
                  </p>
                  <RsvpStatusBadge status={guest.rsvp_status} attendanceMode={guest.attendance_mode} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {guest.guest_phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {guest.guest_phone}
                    </span>
                  )}
                  {guest.invited_by && <span>Invited by {guest.invited_by}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RsvpActionSelect guest={guest} settingRsvpId={settingRsvpId} setRsvpFor={setRsvpFor} />
                  {smsInfo && <SendTextButton guest={guest} info={smsInfo} onSent={toggleSent} />}
                  
                  <SentTextControl guest={guest} markingSentId={markingSentId} onToggleSent={toggleSent} />
                  <EditGuestButton guest={guest} onSave={saveGuestEdits} />
                  <DeleteGuestButton guest={guest} onDelete={deleteGuest} />
                </div>
              </div>
            );})}
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
        <div className="border-b border-border flex items-center justify-between gap-3 p-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer rounded-md hover:bg-muted/40 transition-colors"
            >
              {icon}
              <h2 className="font-semibold truncate">{title}</h2>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function MyGuestsGroup({
  label,
  tone,
  guests,
  peopleCount,
  responseCount,
  open,
  onToggle,
  action,
  isCommitteeGuest,
  duplicateIds,
  settingRsvpId,
  setRsvpFor,
  saveGuestEdits,
  deleteGuest,
  buildSmsInfo,
  markingSentId,
  toggleSent,
}: {
  label: string;
  tone: "emerald" | "muted" | "rose";
  guests: CommitteeGuest[];
  peopleCount: number;
  responseCount: number;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  isCommitteeGuest: (g: CommitteeGuest) => boolean;
  duplicateIds: Set<string>;
  settingRsvpId: string | null;
  setRsvpFor: (guest: CommitteeGuest, value: RsvpAction) => Promise<void>;
  saveGuestEdits: (
    guest: CommitteeGuest,
    edits: { guest_name: string; guest_phone: string },
  ) => Promise<boolean>;
  deleteGuest: (guest: CommitteeGuest) => Promise<void>;
  buildSmsInfo?: (guest: CommitteeGuest) => { phone: string; body: string } | null;
  markingSentId: string | null;
  toggleSent: (guest: CommitteeGuest, checked: boolean) => Promise<void>;
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50/40"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50/40"
        : "border-border bg-muted/30";
  const showUploadedDate = Boolean(action);
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <div className={`rounded-md border ${toneClasses} overflow-hidden`}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-black/[0.03] transition-colors"
          >
            <span className="font-semibold text-sm">{label} ({formatPeopleResponses(peopleCount, responseCount)})</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        {action && <div className="border-t border-border/60 px-3 pb-3">{action}</div>}
        <CollapsibleContent>
          {guests.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground border-t border-border/60">No guests in this group.</div>
          ) : (
            <div className="divide-y divide-border/60 border-t border-border/60 md:max-h-[360px] md:overflow-auto bg-background">
              {guests.map((guest) => (
                <div key={guest.id} className="p-3 flex flex-wrap items-center gap-3">
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
                    {showUploadedDate && guest.created_at && (
                      <p className="text-[11px] text-muted-foreground/80 mt-1">
                        Uploaded {new Date(guest.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <RsvpStatusBadge status={guest.rsvp_status} attendanceMode={guest.attendance_mode} />
                  {guest.rsvp_status === "yes" && (
                    <Badge
                      className={
                        guest.attendance_mode === "zoom"
                          ? "bg-ink/10 text-ink hover:bg-ink/10"
                          : "bg-gold text-ink hover:bg-gold"
                      }
                    >
                      {guest.party_size || 1} {guest.attendance_mode === "zoom" ? "Zoom" : "in person"}
                    </Badge>
                  )}
                  <RsvpActionSelect guest={guest} settingRsvpId={settingRsvpId} setRsvpFor={setRsvpFor} />
                  {buildSmsInfo && (() => {
                    const info = buildSmsInfo(guest);
                    if (!info) return null;
                    return (
                      <SendTextButton guest={guest} info={info} onSent={toggleSent} />
                    );
                  })()}
                  <SentTextControl guest={guest} markingSentId={markingSentId} onToggleSent={toggleSent} />
                  <EditGuestButton guest={guest} onSave={saveGuestEdits} />
                  <DeleteGuestButton guest={guest} onDelete={deleteGuest} />
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RsvpActionSelect({
  guest,
  settingRsvpId,
  setRsvpFor,
}: {
  guest: CommitteeGuest;
  settingRsvpId: string | null;
  setRsvpFor: (guest: CommitteeGuest, value: RsvpAction) => Promise<void>;
}) {
  return (
    <Select
      value=""
      disabled={settingRsvpId === guest.id}
      onValueChange={(v) => void setRsvpFor(guest, v as RsvpAction)}
    >
      <SelectTrigger className="h-8 w-[160px] text-xs">
        <SelectValue placeholder={settingRsvpId === guest.id ? "Saving…" : (guest.rsvp_status === "yes" || guest.rsvp_status === "no" ? "Change RSVP" : "Record RSVP")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="no">Decline</SelectItem>
        <SelectItem value="inperson1">RSVP in person — 1</SelectItem>
        <SelectItem value="inperson2">RSVP in person — 2</SelectItem>
        <SelectItem value="inperson3">RSVP in person — 3</SelectItem>
        <SelectItem value="inperson4">RSVP in person — 4</SelectItem>
        <SelectItem value="zoom1">RSVP by Zoom — 1</SelectItem>
        <SelectItem value="zoom2">RSVP by Zoom — 2</SelectItem>
        <SelectItem value="zoom3">RSVP by Zoom — 3</SelectItem>
        <SelectItem value="zoom4">RSVP by Zoom — 4</SelectItem>
        <SelectItem value="clear">Clear RSVP</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SendTextButton({
  guest,
  info,
  onSent,
}: {
  guest: CommitteeGuest;
  info: { phone: string; body: string };
  onSent: (guest: CommitteeGuest, checked: boolean) => Promise<void>;
}) {
  return (
    <a
      href={`sms:${info.phone}?&body=${encodeURIComponent(info.body)}`}
      onClick={() => {
        if (!guest.invite_sent_at) void onSent(guest, true);
      }}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-sage text-cream text-xs font-medium hover:bg-sage/90"
      aria-label={`Send text to ${guest.guest_name || "guest"}`}
    >
      <MessageSquare className="w-4 h-4" /> {guest.invite_sent_at ? "Resend text" : "Send text"}
    </a>
  );
}

function SentTextControl({
  guest,
  markingSentId,
  onToggleSent,
}: {
  guest: CommitteeGuest;
  markingSentId: string | null;
  onToggleSent: (guest: CommitteeGuest, checked: boolean) => Promise<void>;
}) {
  const sentLabel = guest.invite_sent_at
    ? `Text sent ${new Date(guest.invite_sent_at).toLocaleDateString()}`
    : "I sent the text";
  return (
    <label className="inline-flex items-center gap-2 min-h-8 px-2 rounded-md border border-input text-xs cursor-pointer hover:bg-accent">
      <Checkbox
        checked={!!guest.invite_sent_at}
        disabled={markingSentId === guest.id}
        onCheckedChange={(value) => void onToggleSent(guest, value === true)}
      />
      <span>{markingSentId === guest.id ? "Saving…" : sentLabel}</span>
    </label>
  );
}




function RsvpStatusBadge({ status, attendanceMode }: { status: string | null; attendanceMode?: string | null }) {
  if (status === "yes") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><Clock className="w-3 h-3 mr-1" /> {attendanceMode === "zoom" ? "RSVP by Zoom" : "RSVP in person"}</Badge>;
  }
  if (status === "no") return <Badge variant="secondary">Decline</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function EditGuestButton({
  guest,
  onSave,
}: {
  guest: CommitteeGuest;
  onSave: (
    guest: CommitteeGuest,
    edits: { guest_name: string; guest_phone: string },
  ) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(guest.guest_name);
  const [phone, setPhone] = useState(guest.guest_phone ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(guest.guest_name);
      setPhone(guest.guest_phone ?? "");
    }
  }, [open, guest]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    const ok = await onSave(guest, { guest_name: name, guest_phone: phone });
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
