import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileUp,
  ListChecks,
  MessageSquare,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Send,
  Upload,
  ChevronDown,
  ChevronRight,
  XCircle,
  Clock,
} from "lucide-react";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";

import { inviteTeamMember } from "@/lib/team.functions";
import { extractContactsFromImages } from "@/lib/extract-contacts.functions";

export const Route = createFileRoute("/_authenticated/admin/inviters")({
  head: () => ({ meta: [{ title: "Committee — Admin" }] }),
  component: InvitersPage,
});

type CommitteeRow = {
  id: string;
  name: string;
  contact: string | null;
};
type TeamInviteRow = { id: string; name: string | null; phone: string | null };

type Inviter = {
  id: string;
  name: string;
  quota: number;
  active: boolean;
  host_id: string | null;
  email: string | null;
  phone: string | null;
  requested_quota: number | null;
  quota_request_note: string | null;
  quota_requested_at: string | null;
};
type TeamMsg = { id: string; user_id: string; body: string; created_at: string };
type Profile = { id: string; display_name: string | null; email: string | null };
type Cat = { id: string; name: string; sort_order: number; description: string | null };
type Assign = {
  id: string;
  category_id: string;
  user_id: string | null;
  volunteer_name: string | null;
  notes: string | null;
};
type EventRow = { id: string; title: string };
type ContactRow = { name: string; email: string; phone: string; notes: string };
type GuestRow = {
  id: string;
  host_id: string | null;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  invite_sent_at: string | null;
  
  rsvp_status: string | null;
  rsvp_party_size: number | null;
  rsvp_attendance_mode: string | null;
  rsvp_id: string | null;
};


const TOTAL_CAP = 550;

const normalizePhone = (value: string) => value.replace(/\D/g, "");
const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
const pickContactField = (row: Record<string, unknown>, keys: string[]) => {
  for (const [key, value] of Object.entries(row)) {
    if (keys.includes(key.toLowerCase().trim())) return String(value ?? "").trim();
  }
  return "";
};

function parseVCards(text: string): ContactRow[] {
  return text
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((card) => {
      const lines = card
        .split(/END:VCARD/i)[0]
        .replace(/\r?\n[ \t]/g, "")
        .split(/\r?\n/);
      let name = "",
        email = "",
        phone = "";
      for (const raw of lines) {
        const idx = raw.indexOf(":");
        if (idx < 0) continue;
        const key = raw.slice(0, idx).toUpperCase();
        const value = raw.slice(idx + 1).trim();
        if (!name && key.startsWith("FN")) name = value;
        else if (!name && key.startsWith("N")) {
          const [last, first] = value.split(";");
          name = [first, last].filter(Boolean).join(" ").trim();
        } else if (!email && key.startsWith("EMAIL")) email = value;
        else if (!phone && key.startsWith("TEL")) phone = value;
      }
      return { name, email, phone, notes: "" };
    })
    .filter((row) => row.name || row.email || row.phone);
}

function InvitersPage() {
  const { user } = useAuth();
  const { isAdmin: isActualAdmin, loading: rolesLoading } = useRoles();
  const search = useSearch({ from: "/_authenticated/admin" });
  const previewCommittee = isActualAdmin && search.view === "committee";
  const isAdmin = isActualAdmin && !previewCommittee;
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [invitedCounts, setInvitedCounts] = useState<Record<string, number>>({});
  const [guestsByHost, setGuestsByHost] = useState<Record<string, GuestRow[]>>({});
  const [expandedHost, setExpandedHost] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [committee, setCommittee] = useState<CommitteeRow[]>([]);
  const [msgs, setMsgs] = useState<TeamMsg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [messageBody, setMessageBody] = useState("");
  const [cats, setCats] = useState<Cat[]>([]);
  const [assigns, setAssigns] = useState<Assign[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [savingContacts, setSavingContacts] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState(40);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inviteTeamMemberFn = useServerFn(inviteTeamMember);
  const extractContactsFn = useServerFn(extractContactsFromImages);


  const load = async () => {
    setLoading(true);
    try {
      const [
        { data: inv },
        { data: invites },
        messages,
        profileRows,
        catRows,
        assignRows,
        eventRows,
        { data: invitationsFull },
        { data: rsvpsFull },
      ] = await withTimeout(
        Promise.all([
          supabase.from("inviters").select("*").order("name"),
          supabase.from("invitations").select("host_id"),
          supabase.from("team_messages").select("*").order("created_at").limit(250),
          supabase.from("profiles").select("id,display_name,email"),
          supabase.from("categories").select("*").order("sort_order"),
          supabase.from("category_assignments").select("*"),
          supabase.from("events").select("id,title").order("starts_at", { ascending: true }),
          supabase
            .from("invitations")
            .select("id,host_id,guest_name,guest_email,guest_phone,invite_sent_at")
            .order("guest_name"),
          supabase.from("rsvps").select("id,invitation_id,status,party_size,attendance_mode"),
        ]),
        10000,
      );
      const inviterRows = (inv as Inviter[]) ?? [];
      const profileData = (profileRows.data as Profile[]) ?? [];
      setInviters(inviterRows);
      setMsgs((messages.data as TeamMsg[]) ?? []);
      setProfiles(
        Object.fromEntries(profileData.map((p) => [p.id, p])),
      );
      setCats((catRows.data as Cat[]) ?? []);
      setAssigns((assignRows.data as Assign[]) ?? []);
      const eventData = (eventRows.data as EventRow[]) ?? [];
      setEvents(eventData);
      setEventId((current) => current || eventData[0]?.id || "");
      const invByHost: Record<string, number> = {};
      for (const row of invites ?? []) {
        if (!row.host_id) continue;
        invByHost[row.host_id] = (invByHost[row.host_id] ?? 0) + 1;
      }
      setInvitedCounts(invByHost);

      const rsvpByInvite = new Map<string, { id: string; status: string; party_size: number; attendance_mode: string | null }>();
      for (const r of (rsvpsFull as { id: string; invitation_id: string; status: string; party_size: number; attendance_mode: string | null }[]) ?? []) {
        rsvpByInvite.set(r.invitation_id, r);
      }
      const byHost: Record<string, GuestRow[]> = {};
      for (const row of (invitationsFull as Omit<GuestRow, "rsvp_status" | "rsvp_party_size" | "rsvp_attendance_mode" | "rsvp_id">[]) ?? []) {
        const key = row.host_id ?? "_none";
        const r = rsvpByInvite.get(row.id);
        (byHost[key] ||= []).push({
          ...row,
          rsvp_id: r?.id ?? null,
          rsvp_status: r?.status ?? null,
          rsvp_party_size: r?.party_size ?? null,
          rsvp_attendance_mode: r?.attendance_mode ?? null,
        });
      }
      setGuestsByHost(byHost);

      const [{ data: commData }, { data: teamInviteData }] = await Promise.all([
        supabase
          .from("invitations")
          .select("id,guest_name,guest_email,guest_phone")
          .eq("is_committee", true)
          .order("guest_name"),
        supabase
          .from("team_invites")
          .select("id,name,phone")
          .eq("role", "team")
          .order("name"),
      ]);
      const seenCommittee = new Set<string>();
      const committeeRows: CommitteeRow[] = [];
      for (const row of ((teamInviteData as TeamInviteRow[]) ?? [])) {
        const contact = row.phone ?? null;
        const key = normalizePhone(contact ?? "") || row.name?.trim().toLowerCase() || row.id;
        if (seenCommittee.has(key)) continue;
        seenCommittee.add(key);
        committeeRows.push({ id: `team-${row.id}`, name: row.name || contact || "Committee member", contact });
      }
      for (const row of ((commData as { id: string; guest_name: string; guest_email: string | null; guest_phone: string | null }[]) ?? [])) {
        const contact = row.guest_phone || row.guest_email || null;
        const key = normalizePhone(row.guest_phone ?? "") || row.guest_name.trim().toLowerCase() || row.id;
        if (seenCommittee.has(key)) continue;
        seenCommittee.add(key);
        committeeRows.push({ id: `guest-${row.id}`, name: row.guest_name, contact });
      }
      setCommittee(committeeRows);

      // Ensure every committee member also exists in `inviters` so admin can allocate quota.
      if (isActualAdmin) {
        const existingByPhone = new Set(
          inviterRows
            .map((i) => normalizePhone(i.phone ?? ""))
            .filter((p) => p.length > 0),
        );
        const existingByName = new Set(inviterRows.map((i) => i.name.trim().toLowerCase()));
        const toCreate: { name: string; phone: string | null; quota: number; active: boolean }[] = [];
        for (const m of committeeRows) {
          const phoneNorm = normalizePhone(m.contact ?? "");
          const nameKey = m.name.trim().toLowerCase();
          if (phoneNorm && existingByPhone.has(phoneNorm)) continue;
          if (!phoneNorm && existingByName.has(nameKey)) continue;
          toCreate.push({
            name: m.name,
            phone: m.contact && /\d/.test(m.contact) ? m.contact : null,
            quota: 0,
            active: true,
          });
          if (phoneNorm) existingByPhone.add(phoneNorm);
          existingByName.add(nameKey);
        }
        if (toCreate.length > 0) {
          const { data: inserted } = await supabase
            .from("inviters")
            .insert(toCreate)
            .select("*");
          if (inserted) {
            const merged = [...inviterRows, ...(inserted as Inviter[])].sort((a, b) =>
              a.name.localeCompare(b.name),
            );
            setInviters(merged);
          }
        }
      }


    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rolesLoading) return;
    load();
  }, [rolesLoading, isActualAdmin]);

  useEffect(() => {
    const ch = supabase
      .channel("team-workspace-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as TeamMsg]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [msgs.length]);

  const profileLabel = (id: string) =>
    profiles[id]?.display_name || profiles[id]?.email || "Committee member";

  const hostIdsForInviter = (inviter: Inviter) => {
    const ids = new Set<string>();
    if (inviter.host_id) ids.add(inviter.host_id);
    const inviterName = normalizeName(inviter.name);
    if (inviterName) {
      for (const profile of Object.values(profiles)) {
        if (normalizeName(profile.display_name ?? "") === inviterName) ids.add(profile.id);
      }
    }
    return Array.from(ids);
  };

  const guestsForInviter = (inviter: Inviter) => {
    const seen = new Set<string>();
    const guests: GuestRow[] = [];
    for (const hostId of hostIdsForInviter(inviter)) {
      for (const guest of guestsByHost[hostId] ?? []) {
        const key = normalizePhone(guest.guest_phone ?? "") || normalizeName(guest.guest_name) || guest.id;
        if (seen.has(key)) continue;
        seen.add(key);
        guests.push(guest);
      }
    }
    return guests;
  };

  const confirmedResponseCount = (guests: GuestRow[]) =>
    guests.filter((guest) => guest.rsvp_status === "yes").length;

  const sendMessage = async () => {
    const text = messageBody.trim();
    if (!text || !user) return;
    setMessageBody("");
    const { error } = await supabase.from("team_messages").insert({ user_id: user.id, body: text });
    if (error) {
      toast.error(error.message);
      setMessageBody(text);
    }
  };

  const assignmentLabel = (a: Assign) => {
    if (a.volunteer_name) return a.volunteer_name;
    return (
      profiles[a.user_id ?? ""]?.display_name || profiles[a.user_id ?? ""]?.email || "Unassigned"
    );
  };

  const parseContactFile = async (file: File) => {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".vcf")) {
      setContacts(parseVCards(text));
      return;
    }
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setContacts(
          data
            .map((row) => ({
              name: pickContactField(row, ["name", "full name", "guest", "guest name"]),
              email: pickContactField(row, ["email", "e-mail", "guest email"]),
              phone: pickContactField(row, ["phone", "tel", "mobile", "cell", "guest phone"]),
              notes: pickContactField(row, ["notes", "note"]),
            }))
            .filter((row) => row.name || row.email || row.phone),
        );
      },
      error: (error: Error) => toast.error(error.message),
    });
  };

  const saveContacts = async () => {
    if (!user || !eventId || contacts.length === 0)
      return toast.error("Choose contacts and an event first.");
    setSavingContacts(true);
    try {
      const rows = contacts.map((row) => ({
        event_id: eventId,
        host_id: user.id,
        guest_name: row.name || row.email || row.phone || "Guest",
        guest_email: row.email || null,
        guest_phone: row.phone || null,
        guest_email_normalized: row.email ? row.email.trim().toLowerCase() : null,
        guest_phone_normalized: row.phone ? normalizePhone(row.phone) : null,
        notes: row.notes || null,
      }));
      const { error } = await supabase.from("invitations").insert(rows);
      if (error) return toast.error(error.message);
      toast.success(`${rows.length} invitation${rows.length === 1 ? "" : "s"} added.`);
      setContacts([]);
      load();
    } finally {
      setSavingContacts(false);
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.readAsDataURL(file);
    });

  const onScreenshots = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      toast.error("Please pick image files (PNG, JPG, HEIC).");
      return;
    }
    if (list.length > 10) {
      toast.error("Up to 10 screenshots at a time.");
      return;
    }
    setScreenshotBusy(true);
    try {
      const images = await Promise.all(list.map(fileToDataUrl));
      const { contacts: found } = await extractContactsFn({ data: { images } });
      if (!found.length) {
        toast.error("No contacts found in those screenshots.");
        return;
      }
      setContacts(found.map((c) => ({ name: c.name, email: c.email, phone: c.phone, notes: "" })));
      toast.success(
        `Found ${found.length} contact${found.length === 1 ? "" : "s"} in your screenshot${list.length === 1 ? "" : "s"}`,
      );
    } catch (e) {
      toast.error("Couldn't read those screenshots", { description: getErrorMessage(e) });
    } finally {
      setScreenshotBusy(false);
    }
  };

  const add = async () => {
    if (!name.trim()) return toast.error("Name is required");
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return toast.error("Phone is required");
    setAdding(true);
    try {
      const { error } = await supabase.from("inviters").insert({
        name: name.trim(),
        quota,
        phone: trimmedPhone,
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      try {
        await inviteTeamMemberFn({
          data: {
            role: "team",
            name: name.trim(),
            phone: trimmedPhone,
          },
        });
        toast.success(`Added ${name.trim()}. They'll get committee access when they sign up with ${trimmedPhone}.`);
      } catch (err) {
        toast.error(`Added ${name.trim()}, but committee grant failed: ${getErrorMessage(err)}`);
      }

      setName("");
      setEmail("");
      setPhone("");
      setQuota(40);
      load();
    } finally {
      setAdding(false);
    }
  };

  const updateQuota = async (id: string, q: number) => {
    const { error } = await supabase.from("inviters").update({ quota: q }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const approveQuotaRequest = async (inv: Inviter) => {
    if (inv.requested_quota == null) return;
    const { error } = await supabase
      .from("inviters")
      .update({
        quota: inv.requested_quota,
        requested_quota: null,
        quota_request_note: null,
        quota_requested_at: null,
      })
      .eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success(`Approved — ${inv.name} now has ${inv.requested_quota} RSVPs.`);
    load();
  };

  const declineQuotaRequest = async (inv: Inviter) => {
    const { error } = await supabase
      .from("inviters")
      .update({
        requested_quota: null,
        quota_request_note: null,
        quota_requested_at: null,
      })
      .eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success(`Declined request from ${inv.name}.`);
    load();
  };



  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("inviters").update({ active }).eq("id", id);
    load();
  };

  const declineGuest = async (g: GuestRow) => {
    if (!confirm(`Mark ${g.guest_name} as declined? Their seat returns to the open pool.`)) return;
    setRowBusy(g.id);
    try {
      if (g.rsvp_id) {
        const { error } = await supabase
          .from("rsvps")
          .update({ status: "no", responded_at: new Date().toISOString() })
          .eq("id", g.rsvp_id);
        if (error) return toast.error(error.message);
      } else {
        const { error } = await supabase.from("rsvps").insert({
          invitation_id: g.id,
          status: "no",
          party_size: 0,
          responded_at: new Date().toISOString(),
        });
        if (error) return toast.error(error.message);
      }
      toast.success("Marked as declined.");
      load();
    } finally {
      setRowBusy(null);
    }
  };

  const expireGuest = async (g: GuestRow) => {
    if (!confirm(`Expire ${g.guest_name}'s invite now? Their seat returns to the open pool.`))
      return;
    setRowBusy(g.id);
    try {
      const past = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("invitations")
        .update({ invite_sent_at: past })
        .eq("id", g.id);
      if (error) return toast.error(error.message);
      toast.success("Invite expired.");
      load();
    } finally {
      setRowBusy(null);
    }
  };

  const deleteGuest = async (g: GuestRow) => {
    if (!confirm(`Delete ${g.guest_name}'s invitation entirely?`)) return;
    setRowBusy(g.id);
    try {
      if (g.rsvp_id) await supabase.from("rsvps").delete().eq("id", g.rsvp_id);
      const { error } = await supabase.from("invitations").delete().eq("id", g.id);
      if (error) return toast.error(error.message);
      toast.success("Invitation removed.");
      load();
    } finally {
      setRowBusy(null);
    }
  };



  const remove = async (id: string) => {
    if (!confirm("Remove this inviter? Past RSVPs keep the name.")) return;
    const { error } = await supabase.from("inviters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const totalUsed = Object.values(guestsByHost).flat().reduce(
    (sum, guest) => sum + (guest.rsvp_status === "yes" ? guest.rsvp_party_size ?? 1 : 0),
    0,
  );
  const totalQuota = inviters.reduce((s, i) => s + (i.active ? i.quota : 0), 0);
  const openPool = Math.max(0, TOTAL_CAP - totalUsed);

  return (
    <div className="space-y-8">
      <Card className="p-5 space-y-3">
        <div>
          <h2 className="font-display text-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-terracotta" /> Committee members
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Anyone flagged as committee on the guest list appears here so the whole team can see who's on board.
          </p>
        </div>
        {committee.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No committee members flagged yet. Open <Link to="/admin/upload" className="underline">Add guests / Guest list</Link> and check the committee box next to a guest.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {committee
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="font-medium text-sm">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.contact || "No contact on file"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">

        <Card className="flex min-h-[360px] flex-col overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-terracotta" /> Committee communication
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Everyone on the committee can see and respond here.
            </p>
          </div>
          <div ref={chatScrollRef} className="flex-1 max-h-[360px] overflow-y-auto p-5 space-y-3">
            {msgs.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No messages yet.</p>
            ) : (
              msgs.map((m) => {
                const mine = m.user_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-lg px-4 py-2.5 ${mine ? "bg-ink text-cream" : "bg-secondary"}`}
                    >
                      <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
                        {profileLabel(m.user_id)} ·{" "}
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message the committee…"
              rows={2}
              className="resize-none"
            />
            <Button
              onClick={sendMessage}
              className="bg-ink text-cream hover:bg-ink/90 self-stretch"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div>
              <h2 className="font-display text-xl flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-terracotta" /> Committee needs
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                All current needs and assignments are visible here.
              </p>
            </div>
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {cats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No needs have been added yet.
                </p>
              ) : (
                cats.map((cat) => {
                  const items = assigns.filter((a) => a.category_id === cat.id);
                  return (
                    <div key={cat.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{cat.name}</p>
                        <Badge variant="secondary">{items.length}</Badge>
                      </div>
                      {cat.description && (
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Needs a volunteer</span>
                        {isAdmin && items.map((item) => (
                          <Badge key={item.id} variant={item.user_id ? "default" : "outline"}>
                            {assignmentLabel(item)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Link
              to="/admin/categories"
              search={previewCommittee ? { view: "committee" } : { view: undefined }}
            >
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {isAdmin ? "Add or update needs" : "Choose a volunteer opportunity"}
              </Button>
            </Link>
          </Card>

          <Card className="p-5 space-y-4 border-terracotta/30 bg-terracotta/5">
            <div>
              <h2 className="font-display text-xl flex items-center gap-2">
                <Upload className="w-5 h-5 text-terracotta" /> Upload your contacts to invite
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Please add your guests in either phone contact screenshots or a spreadsheet to ensure guests don't receive multiple invitations.
              </p>
            </div>
            {events.length > 1 && (
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,image/*"
              multiple
              className="hidden"
              disabled={screenshotBusy}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                const images = files.filter((f) => f.type.startsWith("image/"));
                if (images.length > 0) {
                  onScreenshots(images);
                } else {
                  parseContactFile(files[0]);
                }
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={screenshotBusy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {screenshotBusy ? "Reading…" : "Upload spreadsheet or screenshot of contacts"}
            </Button>
            {contacts.length > 0 && (
              <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                <p className="text-sm font-medium">
                  {contacts.length} contact{contacts.length === 1 ? "" : "s"} ready
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-muted-foreground">
                  {contacts.slice(0, 8).map((row, idx) => (
                    <p key={`${row.email}-${idx}`}>
                      {row.name || "Guest"} {row.email ? `· ${row.email}` : ""}{" "}
                      {row.phone ? `· ${row.phone}` : ""}
                    </p>
                  ))}
                </div>
                <Button
                  onClick={saveContacts}
                  disabled={savingContacts}
                  className="w-full bg-ink text-cream hover:bg-ink/90"
                >
                  <Send className="w-4 h-4 mr-2" /> {savingContacts ? "Adding…" : "Add invitations"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>


      {previewCommittee ? null : isAdmin ? (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl">Add Steering Committee Member</h2>
            <p className="text-sm text-muted-foreground">
              They'll appear in the dropdown on the RSVP form.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
              />
            </div>


            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quota">Quota</Label>
              <Input
                id="quota"
                type="number"
                min={0}
                value={quota}
                onChange={(e) => setQuota(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <Button onClick={add} disabled={adding} className="bg-ink text-cream hover:bg-ink/90">
            <UserPlus className="w-4 h-4 mr-2" /> {adding ? "Adding…" : "Add"}
          </Button>
        </Card>
      ) : (
        <Card className="p-6 space-y-2">
          <h2 className="font-display text-xl">Nominate a Steering Committee Member</h2>
          <p className="text-sm text-muted-foreground">
            Only the event admin can add new committee members. To nominate someone, please contact the admin directly at{" "}
            <a href="tel:+18082787562" className="text-terracotta font-medium underline-offset-2 hover:underline">
              (808) 278-7562
            </a>
            .
          </p>
        </Card>
      )}

      {(() => {
        const pending = inviters.filter(
          (i) => i.requested_quota != null && i.requested_quota !== i.quota,
        );
        if (pending.length === 0) return null;
        return (
          <Card className="p-0 overflow-hidden border-terracotta/40">
            <div className="px-6 py-4 border-b border-border bg-terracotta/5">
              <h2 className="font-display text-xl flex items-center gap-2">
                <Clock className="w-5 h-5 text-terracotta" />
                Pending RSVP requests ({pending.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Committee members asking to change their RSVP quota. Approve to update their quota, or decline to clear the request.
              </p>
            </div>
            <div className="divide-y divide-border">
              {pending.map((inv) => (
                <div key={inv.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{inv.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current quota: <span className="font-medium text-foreground">{inv.quota}</span>
                      {" · "}
                      Requesting: <span className="font-medium text-terracotta">{inv.requested_quota}</span>
                    </p>
                    {inv.quota_request_note && (
                      <p className="text-sm mt-1 italic">"{inv.quota_request_note}"</p>
                    )}
                    {inv.quota_requested_at && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Requested {new Date(inv.quota_requested_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => approveQuotaRequest(inv)}
                      className="bg-ink text-cream hover:bg-ink/90"
                    >
                      Approve {inv.requested_quota}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineQuotaRequest(inv)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      <Card className="p-0 overflow-hidden">

        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl">Steering committee invitations &amp; usage</h2>
          <p className="text-sm text-muted-foreground">
            Remaining shows uploaded guests who have not confirmed an RSVP yet.
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-muted-foreground">Loading…</div>
        ) : inviters.length === 0 ? (
          <div className="p-6 text-muted-foreground italic">No inviters yet. Add one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-2 py-3">Name</th>
                  <th className="px-4 py-3 w-24">Quota</th>
                  <th className="px-4 py-3 w-24">Uploaded</th>
                  <th className="px-4 py-3 w-24">RSVPs</th>
                  <th className="px-4 py-3 w-24">Remaining</th>
                  <th className="px-4 py-3 w-24">Status</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {inviters.slice().sort((a, b) => a.name.localeCompare(b.name)).flatMap((i) => {
                  const guests = guestsForInviter(i);
                  const used = confirmedResponseCount(guests);
                  const invited = guests.length || (i.host_id ? (invitedCounts[i.host_id] ?? 0) : 0);
                  const remaining = Math.max(0, invited - used);
                  const isOpen = expandedHost === i.id;
                  const rows: ReactNode[] = [];
                  rows.push(
                    <tr key={`${i.id}-main`} className="border-t border-border">



                        <td className="px-2 py-3">
                          {guests.length > 0 && (
                            <button
                              onClick={() => setExpandedHost(isOpen ? null : i.id)}
                              className="p-1 hover:bg-muted rounded"
                              aria-label={isOpen ? "Collapse guests" : "Expand guests"}
                            >
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-3 font-medium">
                          <div>{i.name}</div>
                          {i.requested_quota != null && i.requested_quota > i.quota && (
                            <div
                              className="mt-2 text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-terracotta text-terracotta"
                              title={i.quota_request_note ?? undefined}
                            >
                              Requested {i.requested_quota} RSVPs (currently {i.quota})
                            </div>
                          )}
                          {i.requested_quota != null && i.requested_quota > i.quota && i.quota_request_note && (
                            <div className="mt-1 text-[11px] text-muted-foreground max-w-[260px] truncate">
                              "{i.quota_request_note}"
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={0}
                            defaultValue={i.quota}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value) || 0;
                              if (v !== i.quota) updateQuota(i.id, v);
                            }}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="px-4 py-3">{invited}</td>
                        <td className="px-4 py-3">{used}</td>
                        <td
                          className={`px-4 py-3 ${remaining < 0 ? "text-destructive font-medium" : ""}`}
                        >
                          {remaining}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(i.id, !i.active)}
                            className={`text-xs px-2 py-1 rounded ${i.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}
                          >
                            {i.active ? "Active" : "Off"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                        </td>
                      </tr>,
                  );
                  if (isOpen && guests.length > 0) {
                    rows.push(
                      <tr key={`${i.id}-exp`} className="bg-muted/20 border-t border-border">
                        <td></td>
                        <td colSpan={7} className="px-2 py-3">
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              Guests invited by {i.name} ({guests.length})
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="text-left text-muted-foreground">
                                  <tr>
                                    <th className="px-2 py-1">Guest</th>
                                    <th className="px-2 py-1">Contact</th>
                                    <th className="px-2 py-1">RSVP</th>
                                    <th className="px-2 py-1 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {guests.map((g) => {
                                    const status = g.rsvp_status ?? "no response";
                                    const busy = rowBusy === g.id;
                                    return (
                                      <tr key={g.id} className="border-t border-border/60">
                                        <td className="px-2 py-2 font-medium">
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              disabled={busy}
                                              onClick={() => deleteGuest(g)}
                                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                              aria-label={`Delete ${g.guest_name}`}
                                              title="Delete this guest"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <span>{g.guest_name}</span>
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 text-muted-foreground">
                                          {g.guest_email || g.guest_phone || "—"}
                                        </td>
                                        <td className="px-2 py-2">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                                              status === "yes"
                                                ? "bg-green-100 text-green-800"
                                                : status === "no"
                                                  ? "bg-red-100 text-red-800"
                                                  : status === "waitlist"
                                                    ? "bg-amber-100 text-amber-800"
                                                    : "bg-muted text-muted-foreground"
                                            }`}
                                          >
                                            {status === "waitlist" ? "waiting list" : status}
                                            {g.rsvp_party_size ? ` · ${g.rsvp_party_size}` : ""}
                                          </span>
                                        </td>
                                        <td className="px-2 py-2">
                                          <div className="flex items-center gap-1 justify-end">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              disabled={busy || status === "no"}
                                              onClick={() => declineGuest(g)}
                                              className="h-7 gap-1"
                                            >
                                              <XCircle className="w-3 h-3" /> Decline
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
              </tbody>

            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
