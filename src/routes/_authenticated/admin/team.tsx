import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Phone, Trash2, Pencil, Check, X, ChevronsUpDown, Users } from "lucide-react";
import { inviteTeamMember, getSignedUpPhoneDigits } from "@/lib/team.functions";
import { normalizeRosterPhone } from "@/lib/committee-roster";


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

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(1, "Phone is required").max(40),
});

function TeamPage() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [invites, setInvites] = useState<Invite[]>([]);
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
    const inv = await supabase
      .from("team_invites")
      .select("id,name,phone,role,accepted_at,created_at")
      .order("created_at", { ascending: false });
    setInvites((inv.data ?? []) as Invite[]);
    try {
      const res = await fetchSignedUpDigits();
      setSignedUpDigits(new Set(res.digits));
    } catch {
      // non-fatal
    }
  };
  useEffect(() => { load(); }, []);

  const isSignedUp = (digits: string) => {
    if (!digits || digits.length < 7) return false;
    const tail = digits.slice(-10);
    for (const d of signedUpDigits) {
      if (d === digits || d.slice(-10) === tail) return true;
    }
    return false;
  };

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

  const pending = invites.filter(
    (i) => !i.accepted_at && !isSignedUp(normalizeRosterPhone(i.phone)),
  );

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

      {isAdmin && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg">Pending invites</h2>
          </div>
          <div className="divide-y divide-border">
            {pending.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">Everyone's accepted — no pending invites.</p>}
            {pending.map((i) => (
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
                      {i.phone ? i.phone : "No phone"} · Awaiting signup
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
                      <button onClick={() => revoke(i.id)} className="text-muted-foreground hover:text-terracotta" aria-label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
