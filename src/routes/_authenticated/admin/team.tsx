import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Phone, Trash2, ShieldCheck, Users, Pencil, Check, X } from "lucide-react";
import { inviteTeamMember, getSignedUpPhoneDigits } from "@/lib/team.functions";
import { buildCommitteeRoster, normalizeRosterPhone } from "@/lib/committee-roster";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: TeamPage,
});

type Invite = {
  id: string;
  name: string | null;
  phone: string | null;
  role: string;
  accepted_at: string | null;
  created_at: string;
};
type CommitteeGuest = { id: string; guest_name: string; guest_email: string | null; guest_phone: string | null };
type InviterRow = { id: string; name: string | null; phone: string | null; active: boolean | null };

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(1, "Phone is required").max(40),
});

function TeamPage() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviters, setInviters] = useState<InviterRow[]>([]);
  const [committeeGuests, setCommitteeGuests] = useState<CommitteeGuest[]>([]);
  const [signedUpDigits, setSignedUpDigits] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"team" | "admin">("team");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const sendInviteFn = useServerFn(inviteTeamMember);
  const fetchSignedUpDigits = useServerFn(getSignedUpPhoneDigits);

  const load = async () => {
    const [inv, inviterRows, comm] = await Promise.all([
      supabase.from("team_invites").select("id,name,phone,role,accepted_at,created_at").order("created_at", { ascending: false }),
      supabase.from("inviters").select("id,name,phone,active").eq("active", true).order("name"),
      supabase.from("invitations").select("id,guest_name,guest_email,guest_phone").eq("is_committee", true).order("guest_name"),
    ]);
    setInvites((inv.data ?? []) as Invite[]);
    setInviters((inviterRows.data ?? []) as InviterRow[]);
    setCommitteeGuests((comm.data ?? []) as CommitteeGuest[]);
    try {
      const res = await fetchSignedUpDigits();
      setSignedUpDigits(new Set(res.digits));
    } catch {
      // non-fatal; status will fall back to "Pending signup"
    }
  };
  useEffect(() => { load(); }, []);

  const sendInvite = async () => {
    const parsed = inviteSchema.safeParse({ name, phone });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the form");
    if (!user) return;
    setSending(true);
    try {
      await sendInviteFn({ data: { ...parsed.data, role } });
      setName(""); setPhone("");
      toast.success(`Added ${parsed.data.name}. They'll get their role automatically when they sign up with ${parsed.data.phone}.`);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add team member");
    } finally {
      setSending(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("team_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const startEdit = (i: Invite) => {
    setEditingId(i.id);
    setEditName(i.name ?? "");
    setEditPhone(i.phone ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPhone("");
  };

  const saveEdit = async (id: string) => {
    const parsed = inviteSchema.safeParse({ name: editName, phone: editPhone });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the form");
    const { error } = await supabase
      .from("team_invites")
      .update({ name: parsed.data.name, phone: parsed.data.phone })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    cancelEdit();
    load();
  };


  const removeRole = async (userId: string, r: string) => {
    if (userId === user?.id && r === "admin") return toast.error("You can't remove your own admin role.");
    if (!confirm(`Remove ${r} access from this user?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", r as "admin" | "team");
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-terracotta" />
            <h2 className="font-display text-xl">Add Steering Committee Member</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
            <Select value={role} onValueChange={(v) => setRole(v as "team" | "admin")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Committee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={sendInvite} disabled={sending} className="bg-ink text-cream hover:bg-ink/90">{sending ? "Adding…" : "Add"}</Button>
          <p className="text-xs text-muted-foreground">
            When this person signs up and enters the same phone number, they'll automatically get {role} access.
          </p>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-terracotta" />
          <h2 className="font-display text-lg">Steering Committee</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Everyone added as a committee member or flagged as committee on the guest list is on the team. People show as "Pending signup" until they log in with their phone number.
        </p>
        {(() => {
          const isSignedUp = (digits: string) => {
            if (!digits || digits.length < 7) return false;
            const tail = digits.slice(-10);
            for (const d of signedUpDigits) {
              if (d === digits || d.slice(-10) === tail) return true;
            }
            return false;
          };
          const rows = buildCommitteeRoster([
            ...inviters.map((inviter) => ({
              id: inviter.id,
              name: inviter.name,
              phone: inviter.phone,
              status: isSignedUp(normalizeRosterPhone(inviter.phone)) ? "Joined" : "Pending signup",
              role: "team",
              source: "inviter" as const,
            })).filter((inviter) => normalizeRosterPhone(inviter.phone).length >= 7),
            ...invites.map((inv) => ({
              id: inv.id,
              name: inv.name,
              phone: inv.phone,
              status: inv.accepted_at || isSignedUp(normalizeRosterPhone(inv.phone)) ? "Joined" : "Pending signup",
              role: inv.role,
              source: "teamInvite" as const,
            })),
            ...committeeGuests.map((g) => ({
              id: g.id,
              name: g.guest_name,
              phone: g.guest_phone,
              email: g.guest_email,
              status: isSignedUp(normalizeRosterPhone(g.guest_phone)) ? "Joined" : "Pending signup",
              role: "team",
              source: "inviter" as const,
            })),
          ]);

          if (rows.length === 0) {
            return <p className="text-sm text-muted-foreground italic">No committee members yet.</p>;
          }
          return (
            <>
              <p className="text-xs text-muted-foreground">{rows.length} committee {rows.length === 1 ? "member" : "members"}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {rows.map((r) => (
                  <div key={r.key} className="rounded-lg border border-border bg-background px-3 py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.contact}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-0.5">{r.status}</p>
                    </div>
                    <Badge variant={r.role === "admin" ? "default" : "secondary"} className="shrink-0">
                      {r.role === "admin" && <ShieldCheck className="w-3 h-3 mr-1" />}{r.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

      </Card>

      {isAdmin && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg">Pending &amp; past invites</h2>
          </div>
          <div className="divide-y divide-border">
            {invites.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No invites added yet.</p>}
            {invites.map((i) => (
              <div key={i.id} className="p-4 flex items-center justify-between gap-3">
                {editingId === i.id ? (
                  <div className="flex-1 grid gap-2 sm:grid-cols-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" />
                    <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone number" />
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">{i.name || i.phone || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.phone ? i.phone : "No phone"} · {i.accepted_at ? `Accepted ${new Date(i.accepted_at).toLocaleDateString()}` : "Awaiting signup"}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{i.role}</Badge>
                  {editingId === i.id ? (
                    <>
                      <button onClick={() => saveEdit(i.id)} className="text-muted-foreground hover:text-terracotta" aria-label="Save">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="text-muted-foreground hover:text-terracotta" aria-label="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(i)} className="text-muted-foreground hover:text-terracotta" aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!i.accepted_at && (
                        <button onClick={() => revoke(i.id)} className="text-muted-foreground hover:text-terracotta" aria-label="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
