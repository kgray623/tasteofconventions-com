import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Plus, Calendar as CalendarIcon, Phone, Trash2, MessageCircle, MessageSquare, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NewBadge } from "@/components/new-badge";
import { CategoryChat } from "@/components/CategoryChat";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { buildDuplicateGroupIds, computeRsvpRollup } from "@/lib/rsvp-math";
import { performProtectedDelete } from "@/lib/perform-protected-delete";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — A Taste of Special Conventions" }] }),
  component: Dashboard,
});

type Invite = {
  id: string; event_id: string; guest_name: string;
  guest_phone: string | null; rsvp_token: string; created_at: string; host_id: string;
  invite_sent_at: string | null;
  is_committee: boolean;
  rsvps?: { status: string; party_size: number; attendance_mode: string | null } | null;
};
type RsvpAction = "inperson1" | "inperson2" | "inperson3" | "inperson4" | "zoom1" | "zoom2" | "zoom3" | "zoom4" | "no" | "clear";
type Flag = { id: string; invitation_a: string; invitation_b: string; match_type: string };
type EventRow = { id: string; title: string; starts_at: string; location: string | null };
type MyCategory = { id: string; name: string; description: string | null };
type ProfileRow = { id: string; display_name: string | null };

function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [settingRsvpId, setSettingRsvpId] = useState<string | null>(null);
  const [myCats, setMyCats] = useState<MyCategory[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [markingSentId, setMarkingSentId] = useState<string | null>(null);
  const chatUnread = useChatUnread();

  const loadVolunteerChats = async (uid: string) => {
    const { data: assigns } = await supabase
      .from("category_assignments")
      .select("category_id")
      .eq("user_id", uid);
    const catIds = Array.from(new Set((assigns ?? []).map((a) => a.category_id)));
    if (catIds.length === 0) {
      setMyCats([]);
      return;
    }
    const { data: cats } = await supabase
      .from("categories")
      .select("id,name,description")
      .in("id", catIds)
      .order("sort_order");
    setMyCats((cats ?? []) as MyCategory[]);
  };

  const load = async () => {
    const [{ data: e }, { data: i }, { data: f }, { data: p }] = await Promise.all([
      supabase.from("events").select("id,title,starts_at,location").order("starts_at"),
      supabase.from("invitations").select("id,event_id,guest_name,guest_phone,rsvp_token,created_at,host_id,invite_sent_at,is_committee,rsvps(status,party_size,attendance_mode)").order("guest_name", { ascending: true }),
      supabase.from("duplicate_flags").select("*"),
      supabase.from("profiles").select("id,display_name"),
    ]);
    setEvents(e ?? []);
    setInvites((i as unknown as Invite[]) ?? []);
    setFlags(f ?? []);
    setProfiles((p ?? []) as ProfileRow[]);
    if (user?.id) await loadVolunteerChats(user.id);
  };

  useEffect(() => { load(); }, [user?.id]);

  const nameForUser = (uid: string) => {
    const p = profiles.find((x) => x.id === uid);
    return p?.display_name || "Member";
  };

  const unreadForCategory = (catId: string) =>
    chatUnread.categories.find((c) => c.category_id === catId)?.count ?? 0;

  const myInvites = invites.filter((i) => i.host_id === user?.id);
  const flaggedIds = new Set<string>();
  flags.forEach((f) => { flaggedIds.add(f.invitation_a); flaggedIds.add(f.invitation_b); });

  const deleteInvitation = async (invite: Invite) => {
    const ok = await performProtectedDelete({
      table: "invitations",
      value: invite.id,
      targetLabel: `${invite.guest_name}${invite.guest_phone ? ` (${invite.guest_phone})` : ""}`,
    });
    if (!ok) return;
    toast.success(`Deleted ${invite.guest_name}`);
    await load();
  };

  const setRsvpFor = async (
    invite: Invite,
    value: RsvpAction,
  ) => {
    setSettingRsvpId(invite.id);
    try {
      if (value === "clear") {
        const { error } = await supabase.from("rsvps").delete().eq("invitation_id", invite.id);
        if (error) throw error;
        toast.success(`Cleared RSVP for ${invite.guest_name}.`);
      } else {
        const status = value === "no" ? "no" : "yes";
        const attendanceMode = value.startsWith("zoom") ? "zoom" : "in_person";
        const partySize = value === "no" ? 1 : Number(value.replace("inperson", "").replace("zoom", ""));
        const { error } = await supabase.from("rsvps").upsert(
          {
            invitation_id: invite.id,
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
            ? `Marked ${invite.guest_name} as declined.`
            : `Marked ${invite.guest_name} attending ${attendanceMode === "zoom" ? "by Zoom" : "in person"} (${partySize}).`,
        );
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Couldn't save RSVP", { description: msg });
    } finally {
      setSettingRsvpId(null);
    }
  };

  const toggleSent = async (invite: Invite, checked: boolean) => {
    setMarkingSentId(invite.id);
    const sentAt = checked ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("invitations")
      .update({ invite_sent_at: sentAt })
      .eq("id", invite.id);
    setMarkingSentId(null);
    if (error) {
      toast.error("Couldn't update sent text", { description: error.message });
      return;
    }
    setInvites((prev) => prev.map((row) => (row.id === invite.id ? { ...row, invite_sent_at: sentAt } : row)));
    toast.success(checked ? "Marked text as sent." : "Marked text as not sent.");
  };

  const saveInviteEdits = async (
    invite: Invite,
    edits: { guest_name: string; guest_phone: string },
  ) => {
    const { error } = await supabase
      .from("invitations")
      .update({
        guest_name: edits.guest_name.trim(),
        guest_phone: edits.guest_phone.trim() || null,
      })
      .eq("id", invite.id);
    if (error) {
      toast.error(`Couldn't save: ${error.message}`);
      return false;
    }
    toast.success(`Updated ${edits.guest_name.trim() || invite.guest_name}.`);
    await load();
    return true;
  };

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "https://tasteofconventions.com";
  const senderName = user?.id ? nameForUser(user.id) : "your friend";
  const rsvpLinkToken = (token: string) => encodeURIComponent(token.trim().replace(/\+/g, "-").replace(/\//g, "_"));
  const buildSmsInfo = (invite: Invite): { phone: string; body: string } | null => {
    if (!invite.guest_phone || !invite.rsvp_token) return null;
    const firstName = (invite.guest_name || "Friend").split(/\s+/)[0];
    const senderFirst = senderName.split(/\s+/)[0] || "your friend";
    const link = `${siteOrigin}/rsvp/${rsvpLinkToken(invite.rsvp_token)}`;
    return {
      phone: invite.guest_phone,
      body: `Hi ${firstName}, it's ${senderFirst}. You're invited to A Taste of Special Conventions on Sunday, August 30, 2026. Please RSVP here: ${link}`,
    };
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
              {invite.guest_phone ? ` (${invite.guest_phone})` : ""} and their RSVP. This cannot be undone.
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

  const inviteGroupIds = buildDuplicateGroupIds(invites.map((i) => ({
    id: i.id,
    guest_name: i.guest_name,
    guest_phone: i.guest_phone,
  })));
  const inviteRollup = computeRsvpRollup(invites.map((i) => ({
    id: i.id,
    groupId: inviteGroupIds.get(i.id) ?? i.id,
    status: i.rsvps?.status ?? null,
    party_size: i.rsvps?.party_size ?? 1,
    attendance_mode: i.rsvps?.attendance_mode ?? null,
  })));
  const stats: { label: string; value: number; newTarget?: string }[] = [
    { label: "Your invitations", value: myInvites.length },
    { label: "Total possible people", value: inviteRollup.people.allIfEveryoneShowed },
    { label: "In-person confirmed people", value: inviteRollup.people.inPerson },
    { label: "Zoom confirmed people", value: inviteRollup.people.zoom },
    { label: "Total confirmed people", value: inviteRollup.people.confirmed },
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

      <Tabs defaultValue="guests" className="w-full">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="guests">Guest list</TabsTrigger>
          <TabsTrigger value="chats" className="relative gap-2">
            <MessageCircle className="w-4 h-4" />
            My volunteer chats
            {myCats.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {myCats.length}
              </Badge>
            )}
            <NewBadge target="dashboard:my-volunteer-chats" className="ml-1" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="space-y-10 mt-6">
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
        <h2 className="font-display text-2xl mb-4">My guests</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Guests you've invited. If someone texts you back to decline (or accept), record their RSVP here.
        </p>
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {myInvites.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                You haven't invited anyone yet.{" "}
                <Link to="/invitations/new" className="text-terracotta underline">Add your first guest</Link>.
              </div>
            )}
            {myInvites.map((i) => {
              const smsInfo = buildSmsInfo(i);
              return (
              <div key={i.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{i.guest_name}</span>
                    {i.is_committee && <Badge className="bg-terracotta text-cream hover:bg-terracotta text-[10px]">Committee</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {i.guest_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{i.guest_phone}</span>}
                  </div>
                </div>
                <RsvpBadge status={i.rsvps?.status} attendanceMode={i.rsvps?.attendance_mode} />
                <Select
                  value=""
                  disabled={settingRsvpId === i.id}
                  onValueChange={(v) =>
                    void setRsvpFor(i, v as RsvpAction)
                  }
                >
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue
                      placeholder={settingRsvpId === i.id ? "Saving…" : i.rsvps?.status ? "Change RSVP" : "Record RSVP"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No / declined</SelectItem>
                    <SelectItem value="inperson1">In person — 1</SelectItem>
                    <SelectItem value="inperson2">In person — 2</SelectItem>
                    <SelectItem value="inperson3">In person — 3</SelectItem>
                    <SelectItem value="inperson4">In person — 4</SelectItem>
                    <SelectItem value="zoom1">Zoom — 1</SelectItem>
                    <SelectItem value="zoom2">Zoom — 2</SelectItem>
                    <SelectItem value="zoom3">Zoom — 3</SelectItem>
                    <SelectItem value="zoom4">Zoom — 4</SelectItem>
                    <SelectItem value="clear">Clear RSVP</SelectItem>
                  </SelectContent>
                </Select>
                {smsInfo && <SendTextButton invite={i} info={smsInfo} onSent={toggleSent} />}
                <SentTextControl invite={i} markingSentId={markingSentId} onToggleSent={toggleSent} />
                <EditInviteButton invite={i} onSave={saveInviteEdits} />
                <Link to="/rsvp/$token" params={{ token: i.rsvp_token }} className="text-xs text-terracotta hover:underline">
                  Open RSVP link →
                </Link>
              </div>
            );})}
          </div>
        </Card>
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
              const smsInfo = buildSmsInfo(i);
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
                      {i.guest_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{i.guest_phone}</span>}
                    </div>
                  </div>
                  <RsvpBadge status={i.rsvps?.status} attendanceMode={i.rsvps?.attendance_mode} />
                  {i.host_id === user?.id && (
                    <Select
                      value=""
                      disabled={settingRsvpId === i.id}
                      onValueChange={(v) => void setRsvpFor(i, v as RsvpAction)}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <SelectValue placeholder={settingRsvpId === i.id ? "Saving…" : i.rsvps?.status ? "Change RSVP" : "Record RSVP"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No / declined</SelectItem>
                        <SelectItem value="inperson1">In person — 1</SelectItem>
                        <SelectItem value="inperson2">In person — 2</SelectItem>
                        <SelectItem value="inperson3">In person — 3</SelectItem>
                        <SelectItem value="inperson4">In person — 4</SelectItem>
                        <SelectItem value="zoom1">Zoom — 1</SelectItem>
                        <SelectItem value="zoom2">Zoom — 2</SelectItem>
                        <SelectItem value="zoom3">Zoom — 3</SelectItem>
                        <SelectItem value="zoom4">Zoom — 4</SelectItem>
                        <SelectItem value="clear">Clear RSVP</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {smsInfo && i.host_id === user?.id && <SendTextButton invite={i} info={smsInfo} onSent={toggleSent} />}
                  {i.host_id === user?.id && <SentTextControl invite={i} markingSentId={markingSentId} onToggleSent={toggleSent} />}
                  {i.host_id === user?.id && <EditInviteButton invite={i} onSave={saveInviteEdits} />}
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
                          {i.guest_phone ? ` (${i.guest_phone})` : ""} along with their RSVP. This cannot be undone.
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
        </TabsContent>

        <TabsContent value="chats" className="mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl">My volunteer chats</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Categories you've volunteered for. Tap to open the chat with your team.
              </p>
            </div>
            {myCats.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                You haven't volunteered for any roles yet.{" "}
                <Link to="/admin/categories" className="text-terracotta underline">
                  Browse volunteer opportunities
                </Link>
                .
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {myCats.map((c) => {
                  const unread = unreadForCategory(c.id);
                  return (
                    <Card key={c.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg truncate">{c.name}</h3>
                          {unread > 0 && (
                            <Badge className="bg-brand-red text-white hover:bg-brand-red text-[10px]">
                              {unread} new
                            </Badge>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {c.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setChatOpen(c.id)}
                        className="shrink-0"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                      <CategoryChat
                        open={chatOpen === c.id}
                        onOpenChange={(v) => setChatOpen(v ? c.id : null)}
                        categoryId={c.id}
                        categoryName={c.name}
                        canChat={true}
                        isAdmin={false}
                        nameFor={nameForUser}
                      />
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RsvpBadge({ status, attendanceMode }: { status?: string; attendanceMode?: string | null }) {
  if (!status || status === "pending") return <Badge variant="outline">awaiting</Badge>;
  if (status === "yes") {
    return attendanceMode === "zoom" ? (
      <Badge className="bg-ink text-cream hover:bg-ink">attending virtual</Badge>
    ) : (
      <Badge className="bg-gold text-ink hover:bg-gold">attending in person</Badge>
    );
  }
  if (status === "no") return <Badge variant="secondary">declined</Badge>;
  return <Badge variant="outline">maybe</Badge>;
}

function SendTextButton({
  invite,
  info,
  onSent,
}: {
  invite: Invite;
  info: { phone: string; body: string };
  onSent: (invite: Invite, checked: boolean) => Promise<void>;
}) {
  return (
    <a
      href={`sms:${info.phone}?&body=${encodeURIComponent(info.body)}`}
      onClick={() => {
        if (!invite.invite_sent_at) void onSent(invite, true);
      }}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-sage text-cream text-xs font-medium hover:bg-sage/90"
      aria-label={`Send text to ${invite.guest_name || "guest"}`}
    >
      <MessageSquare className="w-4 h-4" /> {invite.invite_sent_at ? "Resend text" : "Send text"}
    </a>
  );
}

function SentTextControl({
  invite,
  markingSentId,
  onToggleSent,
}: {
  invite: Invite;
  markingSentId: string | null;
  onToggleSent: (invite: Invite, checked: boolean) => Promise<void>;
}) {
  const sentLabel = invite.invite_sent_at
    ? `Text sent ${new Date(invite.invite_sent_at).toLocaleDateString()}`
    : "I sent the text";
  return (
    <label className="inline-flex items-center gap-2 min-h-8 px-2 rounded-md border border-input text-xs cursor-pointer hover:bg-accent">
      <Checkbox
        checked={!!invite.invite_sent_at}
        disabled={markingSentId === invite.id}
        onCheckedChange={(value) => void onToggleSent(invite, value === true)}
      />
      <span>{markingSentId === invite.id ? "Saving…" : sentLabel}</span>
    </label>
  );
}

function EditInviteButton({
  invite,
  onSave,
}: {
  invite: Invite;
  onSave: (invite: Invite, edits: { guest_name: string; guest_phone: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(invite.guest_name);
  const [phone, setPhone] = useState(invite.guest_phone ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(invite.guest_name);
      setPhone(invite.guest_phone ?? "");
    }
  }, [open, invite]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    const ok = await onSave(invite, { guest_name: name, guest_phone: phone });
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
          aria-label={`Edit ${invite.guest_name}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit guest</DialogTitle>
          <DialogDescription>Update {invite.guest_name}'s contact info.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`edit-invite-name-${invite.id}`}>Name</Label>
            <Input id={`edit-invite-name-${invite.id}`} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit-invite-phone-${invite.id}`}>Phone</Label>
            <Input id={`edit-invite-phone-${invite.id}`} value={phone} onChange={(event) => setPhone(event.target.value)} />
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
