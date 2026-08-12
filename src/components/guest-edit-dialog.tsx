import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateGuestRecord } from "@/lib/guest-edit.functions";

export type GuestEditTarget = {
  invitation_id: string;
  name: string;
  phone: string;
  rsvp_status: string;
  party_size: number | string;
  attendance_mode: string;
  preorder_meals: number;
};

export type GuestEditResult = {
  invitation_id: string;
  name: string;
  phone: string;
  rsvp_status: string;
  party_size: number | string;
  attendance_mode: string;
  responded_at: string;
};

type StatusValue = "yes" | "no" | "maybe" | "waitlist" | "pending";

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: "yes", label: "Yes — attending" },
  { value: "no", label: "No — declined" },
  { value: "maybe", label: "Maybe" },
  { value: "waitlist", label: "Waitlist" },
  { value: "pending", label: "No reply yet" },
];

export function GuestEditDialog({
  guest,
  onOpenChange,
  onSaved,
}: {
  guest: GuestEditTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (row: GuestEditResult) => void;
}) {
  const save = useServerFn(updateGuestRecord);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<StatusValue>("pending");
  const [partySize, setPartySize] = useState("1");
  const [mode, setMode] = useState<"in_person" | "zoom">("in_person");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [mealWarning, setMealWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!guest) return;
    setName(guest.name ?? "");
    setPhone(guest.phone ?? "");
    const s = (guest.rsvp_status || "pending") as StatusValue;
    setStatus(["yes", "no", "maybe", "waitlist"].includes(s) ? s : "pending");
    setPartySize(String(Number(guest.party_size) || 1));
    setMode(guest.attendance_mode === "zoom" ? "zoom" : "in_person");
    setReason("");
    setMealWarning(null);
  }, [guest]);

  const submit = async (confirmMealImpact: boolean) => {
    if (!guest) return;
    if (!name.trim()) {
      toast.error("A name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await save({
        data: {
          invitationId: guest.invitation_id,
          name: name.trim(),
          phone: phone.trim(),
          status,
          partySize: Number(partySize) || (status === "no" ? 0 : 1),
          attendanceMode: mode,
          reason: reason.trim() || undefined,
          confirmMealImpact,
        },
      });
      if (!res.ok) {
        setMealWarning(res.message ?? "Please confirm this change.");
        return;
      }
      setMealWarning(null);
      onSaved(res.guest);
      toast.success(`Saved ${res.guest.name}`, {
        description: `Now ${res.guest.rsvp_status === "pending" ? "no reply yet" : res.guest.rsvp_status}${
          res.guest.attendance_mode ? ` · ${res.guest.attendance_mode === "zoom" ? "Zoom" : "In person"}` : ""
        }`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that change.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!guest} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit RSVP on their behalf</DialogTitle>
          <DialogDescription>
            Changes are recorded in the activity log with your name. Meals and payments are never changed here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="guest-edit-name">Name</Label>
            <Input id="guest-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-edit-phone">Phone</Label>
            <Input
              id="guest-edit-phone"
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="808-555-1234"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>RSVP</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusValue)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-edit-party">Party size</Label>
              <Input
                id="guest-edit-party"
                type="number"
                min={status === "no" ? 0 : 1}
                max={50}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                disabled={status === "pending"}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Attending</Label>
            <div className="flex gap-2">
              {(["in_person", "zoom"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={mode === m ? "default" : "outline"}
                  className={mode === m ? "bg-ink text-cream hover:bg-ink/90" : ""}
                  onClick={() => setMode(m)}
                >
                  {m === "in_person" ? "In person" : "Zoom"}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-edit-reason">Note for the log (optional)</Label>
            <Input
              id="guest-edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. she texted me to switch to Zoom"
            />
          </div>

          {guest && guest.preorder_meals > 0 && (
            <p className="text-xs text-muted-foreground">
              This guest has {guest.preorder_meals} meal{guest.preorder_meals === 1 ? "" : "s"} on order. Meals are
              cancelled separately so restaurant counts and payments stay accurate.
            </p>
          )}

          {mealWarning && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              {mealWarning}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          {mealWarning ? (
            <Button onClick={() => void submit(true)} disabled={saving} className="bg-ink text-cream hover:bg-ink/90">
              {saving ? "Saving…" : "Save anyway"}
            </Button>
          ) : (
            <Button onClick={() => void submit(false)} disabled={saving} className="bg-ink text-cream hover:bg-ink/90">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
