import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAdminView } from "@/hooks/use-admin-view";
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

type GuestOption = {
  id: string;
  name: string;
  phone: string;
  digits: string;
  isCommittee: boolean;
};


const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().max(40).optional().default(""),
});

function TeamPage() {
  const { user } = useAuth();
  const { isAdmin } = useAdminView();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [signedUpDigits, setSignedUpDigits] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
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
    const g = await supabase
      .from("invitations")
      .select("id,guest_name,guest_phone,is_committee")
      .order("guest_name", { ascending: true });
    setGuests(
      ((g.data ?? []) as Array<{ id: string; guest_name: string | null; guest_phone: string | null; is_committee: boolean | null }>)
        .map((row) => ({
          id: row.id,
          name: (row.guest_name ?? "").trim() || "(no name)",
          phone: row.guest_phone ?? "",
          digits: normalizeRosterPhone(row.guest_phone),
          isCommittee: !!row.is_committee,
        }))
        .filter((row) => row.digits.length >= 7),
    );
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

    let finalPhone = parsed.data.phone.trim();
    // If no phone entered, try to auto-resolve from the guest list by name.
    if (!finalPhone) {
      const nameQ = parsed.data.name.trim().toLowerCase();
      const exact = guests.filter((g) => g.name.trim().toLowerCase() === nameQ && g.phone);
      const contains = exact.length === 0
        ? guests.filter((g) => g.name.toLowerCase().includes(nameQ) && g.phone)
        : exact;
      if (contains.length === 0) {
        return toast.error(`No guest named "${parsed.data.name}" has a phone on file. Pick from the list or enter a phone.`);
      }
      if (contains.length > 1) {
        return toast.error(`Multiple guests match "${parsed.data.name}". Pick the exact person from the list above.`);
      }
      finalPhone = contains[0].phone;
    }

    setSending(true);
    try {
      await sendInviteFn({ data: { name: parsed.data.name, phone: finalPhone, role } });
      setName(""); setPhone(""); setSelectedGuestId(null);
      toast.success(`Added ${parsed.data.name}. They'll get their role automatically when they sign up with ${finalPhone}.`);
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

  const committeeTails = useMemo(() => {
    const set = new Set<string>();
    for (const g of guests) if (g.isCommittee && g.digits) set.add(g.digits.slice(-10));
    return set;
  }, [guests]);

  const pending = invites.filter((i) => {
    if (i.accepted_at) return false;
    const digits = normalizeRosterPhone(i.phone);
    if (isSignedUp(digits)) return false;
    if (digits && committeeTails.has(digits.slice(-10))) return false;
    return true;
  });

  const existingCommitteeTails = useMemo(() => {
    const set = new Set<string>(committeeTails);
    for (const inv of invites) {
      const d = normalizeRosterPhone(inv.phone);
      if (d) set.add(d.slice(-10));
    }
    return set;
  }, [committeeTails, invites]);

  const selectedGuest = guests.find((g) => g.id === selectedGuestId) ?? null;

  const pickGuest = (g: GuestOption) => {
    setSelectedGuestId(g.id);
    setName(g.name);
    setPhone(g.phone);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-terracotta" />
            <h2 className="font-display text-xl">Add Steering Committee Member</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-terracotta" /> Pick from guest list
            </label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedGuest ? `${selectedGuest.name} — ${selectedGuest.phone}` : "Search guests by name or phone…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-w-[95vw]" align="start">
                <Command
                  filter={(value, search) => {
                    const s = search.toLowerCase().trim();
                    if (!s) return 1;
                    return value.toLowerCase().includes(s) ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="Type a name or phone…" />
                  <CommandList>
                    <CommandEmpty>No matching guest.</CommandEmpty>
                    <CommandGroup>
                      {guests.map((g) => {
                        const already = existingCommitteeTails.has(g.digits.slice(-10));
                        return (
                          <CommandItem
                            key={g.id}
                            value={`${g.name} ${g.phone} ${g.digits}`}
                            disabled={already}
                            onSelect={() => !already && pickGuest(g)}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate">{g.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{g.phone}</div>
                            </div>
                            {already && <Badge variant="outline" className="shrink-0">Already committee</Badge>}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Choose someone already on the guest list, or type a new name and phone below.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setSelectedGuestId(null); }}
              placeholder="Full name"
            />
            <Input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setSelectedGuestId(null); }}
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
