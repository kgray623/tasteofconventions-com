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
import { inviteTeamMember } from "@/lib/team.functions";

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
type Member = { user_id: string; role: string; profile?: { display_name: string | null; email: string | null } };
type CommitteeGuest = { id: string; guest_name: string; guest_email: string | null; guest_phone: string | null };

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(1, "Phone is required").max(40),
});

function TeamPage() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [committeeGuests, setCommitteeGuests] = useState<CommitteeGuest[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"team" | "admin">("team");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const sendInviteFn = useServerFn(inviteTeamMember);

  const load = async () => {
    const [inv, mem, prof, comm] = await Promise.all([
      supabase.from("team_invites").select("id,name,phone,role,accepted_at,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role").in("role", ["admin", "team"]),
      supabase.from("profiles").select("id,display_name,email"),
      supabase.from("invitations").select("id,guest_name,guest_email,guest_phone").eq("is_committee", true).order("guest_name"),
    ]);
    setInvites((inv.data ?? []) as Invite[]);
    const profMap = new Map((prof.data ?? []).map((p) => [p.id, p]));
    setMembers((mem.data ?? []).map((m) => ({ ...m, profile: profMap.get(m.user_id) })));
    setCommitteeGuests((comm.data ?? []) as CommitteeGuest[]);
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
          Everyone added as a committee member or flagged as committee on the guest list. People show as "Pending signup" until they log in with their phone number.
        </p>
        {(() => {
          const seen = new Set<string>();
          const norm = (p?: string | null) => (p ? p.replace(/\D/g, "") : "");
          type Row = {
            key: string;
            name: string;
            contact: string;
            status: string;
            role?: string;
            userId?: string;
          };
          const rows: Row[] = [];

          for (const inv of invites) {
            const k = norm(inv.phone) || `ti-${inv.id}`;
            if (seen.has(k)) continue;
            seen.add(k);
            rows.push({
              key: `ti-${inv.id}`,
              name: inv.name || inv.phone || "—",
              contact: inv.phone || "No phone",
              status: inv.accepted_at ? "Joined" : "Pending signup",
              role: inv.role,
            });
          }
          for (const g of committeeGuests) {
            const k = norm(g.guest_phone) || `cg-${g.id}`;
            if (seen.has(k)) continue;
            seen.add(k);
            rows.push({
              key: `cg-${g.id}`,
              name: g.guest_name,
              contact: g.guest_phone || g.guest_email || "No contact on file",
              status: "On guest list",
            });
          }
          // Include signed-up users who weren't represented by an invite (e.g. admins added directly).
          for (const m of members) {
            const label = m.profile?.display_name || m.profile?.email || m.user_id.slice(0, 8);
            const alreadyShown = rows.some(
              (r) => r.name.toLowerCase() === (label ?? "").toLowerCase(),
            );
            if (alreadyShown) continue;
            rows.push({
              key: `ur-${m.user_id}-${m.role}`,
              name: label,
              contact: m.profile?.email || "Signed in",
              status: "Joined",
              role: m.role,
              userId: m.user_id,
            });
          }

          if (rows.length === 0) {
            return <p className="text-sm text-muted-foreground italic">No committee members yet.</p>;
          }
          return (
            <div className="grid sm:grid-cols-2 gap-2">
              {rows.map((r) => (
                <div key={r.key} className="rounded-lg border border-border bg-background px-3 py-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.contact}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-0.5">{r.status}</p>
                  </div>
                  {r.role && (
                    <Badge variant={r.role === "admin" ? "default" : "secondary"} className="shrink-0">
                      {r.role === "admin" && <ShieldCheck className="w-3 h-3 mr-1" />}{r.role}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
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
