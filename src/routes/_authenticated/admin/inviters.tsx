import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAdminView } from "@/hooks/use-admin-view";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Trash2,
  Users,
  ChevronDown,
  ChevronRight,
  XCircle,
  Clock,
} from "lucide-react";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";

import { buildCommitteeRoster } from "@/lib/committee-roster";

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

function InvitersPage() {
  const { loading: rolesLoading, isAdmin } = useAdminView();
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [invitedCounts, setInvitedCounts] = useState<Record<string, number>>({});
  const [guestsByHost, setGuestsByHost] = useState<Record<string, GuestRow[]>>({});
  const [expandedHost, setExpandedHost] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [committee, setCommittee] = useState<CommitteeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [
        { data: inv },
        { data: invites },
        { data: invitationsFull },
        { data: rsvpsFull },
      ] = await withTimeout(
        Promise.all([
          supabase.from("inviters").select("*").order("name"),
          supabase.from("invitations").select("host_id"),
          supabase
            .from("invitations")
            .select("id,host_id,guest_name,guest_email,guest_phone,invite_sent_at")
            .order("guest_name"),
          supabase.from("rsvps").select("id,invitation_id,status,party_size,attendance_mode"),
        ]),
        10000,
      );
      const inviterRows = (inv as Inviter[]) ?? [];
      setInviters(inviterRows);
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
      const committeeRows: CommitteeRow[] = buildCommitteeRoster([
        ...inviterRows.filter((row) => row.active !== false && normalizePhone(row.phone ?? "").length >= 7).map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          source: "inviter" as const,
        })),
        ...(((teamInviteData as TeamInviteRow[]) ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          source: "teamInvite" as const,
        }))),
        ...(((commData as { id: string; guest_name: string; guest_email: string | null; guest_phone: string | null }[]) ?? []).map((row) => ({
          id: row.id,
          name: row.guest_name,
          phone: row.guest_phone,
          email: row.guest_email,
          source: "inviter" as const,
        }))),
      ]).map((member) => ({ id: member.key, name: member.name, contact: member.contact }));
      setCommittee(committeeRows);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rolesLoading) return;
    load();
  }, [rolesLoading]);

  const hostIdsForInviter = (inviter: Inviter) => {
    const ids = new Set<string>();
    if (inviter.host_id) ids.add(inviter.host_id);
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
    guests.filter((guest) => guest.rsvp_status === "yes" && guest.rsvp_attendance_mode !== "zoom").length;

  const virtualResponseCount = (guests: GuestRow[]) =>
    guests.filter((guest) => guest.rsvp_status === "yes" && guest.rsvp_attendance_mode === "zoom").length;

  const updateQuota = async (id: string, q: number) => {
    // Clear any pending request fields so a stale requested_quota can't linger
    // as a phantom "pending" after an admin manually edits the approved quota.
    const { error } = await supabase
      .from("inviters")
      .update({
        quota: q,
        requested_quota: null,
        quota_request_note: null,
        quota_requested_at: null,
      })
      .eq("id", id);
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

  // Keep computed totals available (used elsewhere previously); silence unused.
  void TOTAL_CAP;

  return (
    <div className="space-y-8">
      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-terracotta" /> Committee members
          </h2>
          {isAdmin && (
            <Link
              to="/admin/team"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-cream hover:bg-ink/90"
            >
              <Users className="w-4 h-4" /> Add committee member
            </Link>
          )}

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
            Remaining is approved RSVP requests minus in-person confirmations. Uploaded guests are tracked separately.
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-muted-foreground">Loading…</div>
        ) : inviters.length === 0 ? (
          <div className="p-6 text-muted-foreground italic">No inviters yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-2 py-3">Name</th>
                  <th className="px-4 py-3 w-24">Requests</th>
                  <th className="px-4 py-3 w-24">Uploaded</th>
                  <th className="px-4 py-3 w-32">In-person</th>
                  <th className="px-4 py-3 w-24">Virtual</th>
                  <th className="px-4 py-3 w-24">Remaining</th>
                  <th className="px-4 py-3 w-24">Status</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {inviters.slice().sort((a, b) => a.name.localeCompare(b.name)).flatMap((i) => {
                  const guests = guestsForInviter(i);
                  const used = confirmedResponseCount(guests);
                  const virtual = virtualResponseCount(guests);
                  const invited = guests.length || (i.host_id ? (invitedCounts[i.host_id] ?? 0) : 0);
                  const remaining = Math.max(0, i.quota - used);
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
                        <td className="px-4 py-3 text-muted-foreground">{virtual}</td>
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
                        <td colSpan={8} className="px-2 py-3">
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
                                          {g.guest_phone || "—"}
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
