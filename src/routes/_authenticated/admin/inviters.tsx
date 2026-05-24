import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, UserPlus, Send } from "lucide-react";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";
import { inviteTeamMember } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/admin/inviters")({
  head: () => ({ meta: [{ title: "Inviters — Admin" }] }),
  component: InvitersPage,
});

type Inviter = { id: string; name: string; quota: number; active: boolean; host_id: string | null; email: string | null; phone: string | null };

const TOTAL_CAP = 550;

function InvitersPage() {
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [invitedCounts, setInvitedCounts] = useState<Record<string, number>>({});
  const [unassigned, setUnassigned] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState(40);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const inviteTeamMemberFn = useServerFn(inviteTeamMember);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: inv }, { data: rsvps }, { data: invites }] = await withTimeout(Promise.all([
        supabase.from("inviters").select("*").order("name"),
        supabase.from("rsvps").select("invited_by,party_size,status"),
        supabase.from("invitations").select("host_id"),
      ]), 10000);
      setInviters((inv as Inviter[]) ?? []);
      const counts: Record<string, number> = {};
      let other = 0;
      const known = new Set((inv ?? []).map((i: any) => i.name.toLowerCase()));
      for (const r of rsvps ?? []) {
        if (r.status !== "yes") continue;
        const key = (r.invited_by ?? "").trim();
        const seats = r.party_size ?? 1;
        if (!key) { other += seats; continue; }
        if (known.has(key.toLowerCase())) {
          counts[key.toLowerCase()] = (counts[key.toLowerCase()] ?? 0) + seats;
        } else {
          other += seats;
        }
      }
      setUsage(counts);
      setUnassigned(other);
      const invByHost: Record<string, number> = {};
      for (const row of invites ?? []) {
        if (!row.host_id) continue;
        invByHost[row.host_id] = (invByHost[row.host_id] ?? 0) + 1;
      }
      setInvitedCounts(invByHost);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return toast.error("Name is required");
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    setAdding(true);
    try {
      const { error } = await supabase.from("inviters").insert({
        name: name.trim(),
        quota,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      if (trimmedEmail) {
        try {
          const res = await inviteTeamMemberFn({
            data: {
              email: trimmedEmail,
              role: "team",
              name: name.trim(),
              phone: trimmedPhone || "n/a",
            },
          });
          if (res.emailQueued) {
            toast.success(`Added and emailed invite to ${trimmedEmail}.`);
          } else {
            toast.success(`Added ${name.trim()}, but invite email could not be sent (${res.reason ?? "unknown"}).`);
          }
        } catch (err: any) {
          toast.error(`Added ${name.trim()}, but invite email failed: ${err?.message ?? "unknown error"}`);
        }
      } else {
        toast.success("Team member added");
      }

      setName(""); setEmail(""); setPhone(""); setQuota(40);
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

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("inviters").update({ active }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this inviter? Past RSVPs keep the name.")) return;
    const { error } = await supabase.from("inviters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const totalUsed = Object.values(usage).reduce((a, b) => a + b, 0) + unassigned;
  const totalQuota = inviters.reduce((s, i) => s + (i.active ? i.quota : 0), 0);
  const openPool = Math.max(0, TOTAL_CAP - totalUsed);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total cap</p>
          <p className="font-display text-3xl mt-2">{TOTAL_CAP}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Seats used (attending)</p>
          <p className="font-display text-3xl mt-2">{totalUsed}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Allocated quota</p>
          <p className="font-display text-3xl mt-2">{totalQuota}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Open pool</p>
          <p className="font-display text-3xl mt-2 text-terracotta">{openPool}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Add Team Member</h2>
          <p className="text-sm text-muted-foreground">They'll appear in the dropdown on the RSVP form.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quota">Quota</Label>
            <Input id="quota" type="number" min={0} value={quota} onChange={(e) => setQuota(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <Button onClick={add} disabled={adding} className="bg-ink text-cream hover:bg-ink/90">
          <UserPlus className="w-4 h-4 mr-2" /> {adding ? "Adding…" : "Add"}
        </Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl">Inviters & usage</h2>
          <p className="text-sm text-muted-foreground">Seats are counted from RSVPs marked attending. Unused quota stays in the open pool.</p>
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
                <th className="px-6 py-3">Name</th>
                <th className="px-4 py-3 w-24">Quota</th>
                <th className="px-4 py-3 w-24">Uploaded</th>
                <th className="px-4 py-3 w-24">RSVPs</th>
                <th className="px-4 py-3 w-24">Remaining</th>
                <th className="px-4 py-3 w-24">Status</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {inviters.map((i) => {
                const used = usage[i.name.toLowerCase()] ?? 0;
                const invited = i.host_id ? (invitedCounts[i.host_id] ?? 0) : 0;
                const remaining = i.quota - Math.max(used, invited);
                return (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-6 py-3 font-medium">{i.name}</td>
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
                    <td className={`px-4 py-3 ${remaining < 0 ? "text-destructive font-medium" : ""}`}>{remaining}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(i.id, !i.active)}
                        className={`text-xs px-2 py-1 rounded ${i.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}
                      >
                        {i.active ? "Active" : "Off"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {unassigned > 0 && (
                <tr className="border-t border-border bg-muted/20">
                  <td className="px-6 py-3 italic text-muted-foreground">Unassigned / other</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">{unassigned}</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">—</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
