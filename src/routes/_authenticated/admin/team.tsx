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
import { Phone, Trash2, ShieldCheck, Users } from "lucide-react";
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

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(1, "Phone is required").max(40),
});

function TeamPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"team" | "admin">("team");
  const [sending, setSending] = useState(false);
  const sendInviteFn = useServerFn(inviteTeamMember);

  const load = async () => {
    const [inv, mem, prof] = await Promise.all([
      supabase.from("team_invites").select("id,name,phone,role,accepted_at,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role").in("role", ["admin", "team"]),
      supabase.from("profiles").select("id,display_name,email"),
    ]);
    setInvites((inv.data ?? []) as Invite[]);
    const profMap = new Map((prof.data ?? []).map((p) => [p.id, p]));
    setMembers((mem.data ?? []).map((m) => ({ ...m, profile: profMap.get(m.user_id) })));
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

  const removeRole = async (userId: string, r: string) => {
    if (userId === user?.id && r === "admin") return toast.error("You can't remove your own admin role.");
    if (!confirm(`Remove ${r} access from this user?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", r as "admin" | "team");
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
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

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4" /> <h2 className="font-display text-lg">Committee members</h2>
        </div>
        <div className="divide-y divide-border">
          {members.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No committee members yet.</p>}
          {members.map((m) => (
            <div key={`${m.user_id}-${m.role}`} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{m.profile?.display_name || m.profile?.email || m.user_id.slice(0, 8)}</p>
                {m.profile?.email && <p className="text-xs text-muted-foreground">{m.profile.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                  {m.role === "admin" && <ShieldCheck className="w-3 h-3 mr-1" />}{m.role}
                </Badge>
                <button onClick={() => removeRole(m.user_id, m.role)} className="text-muted-foreground hover:text-terracotta">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-display text-lg">Pending &amp; past invites</h2>
        </div>
        <div className="divide-y divide-border">
          {invites.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No invites added yet.</p>}
          {invites.map((i) => (
            <div key={i.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{i.name || i.phone || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {i.phone ? i.phone : "No phone"} · {i.accepted_at ? `Accepted ${new Date(i.accepted_at).toLocaleDateString()}` : "Awaiting signup"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{i.role}</Badge>
                {!i.accepted_at && (
                  <button onClick={() => revoke(i.id)} className="text-muted-foreground hover:text-terracotta">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
