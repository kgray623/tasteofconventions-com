import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { NewBadge } from "@/components/new-badge";
import { toast } from "sonner";

const TOTAL_SEATS = 550;

type EventTotals = {
  requested: number;       // sum of active inviter quotas
  confirmed: number;       // in-person yes (people)
  virtual: number;         // zoom yes (people)
};

type MyTotals = {
  requested: number;       // my quota
  uploaded: number;        // # invitations I've uploaded
  confirmed: number;       // my in-person yes (people)
  virtual: number;         // my zoom yes (people)
  pendingRequest: number | null;
};

type InviterRow = {
  id: string;
  host_id: string | null;
  quota: number | null;
  active: boolean | null;
  requested_quota: number | null;
};

type Props = {
  /** When provided, also render this committee member's personal slot. */
  personalHostIds?: string[];
};

export function RsvpTotalsCard({ personalHostIds }: Props) {
  const [event, setEvent] = useState<EventTotals>({ requested: 0, confirmed: 0, virtual: 0 });
  const [mine, setMine] = useState<MyTotals>({ requested: 0, uploaded: 0, confirmed: 0, virtual: 0, pendingRequest: null });
  const [myInviterIds, setMyInviterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const showPersonal = Array.isArray(personalHostIds) && personalHostIds.length > 0;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: inviters } = await supabase
        .from("inviters")
        .select("id,host_id,quota,active,requested_quota");
      const inviterRows = (inviters ?? []) as InviterRow[];
      const requested = inviterRows.reduce(
        (sum, r) => sum + (r.active === false ? 0 : r.quota ?? 0),
        0,
      );

      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("party_size,status,invitation_id,attendance_mode");
      const yesRsvps = (rsvps ?? []).filter((r) => r.status === "yes");
      const inPersonYes = yesRsvps.filter((r) => r.attendance_mode !== "zoom");
      const virtualYes = yesRsvps.filter((r) => r.attendance_mode === "zoom");
      const confirmed = inPersonYes.reduce((s, r) => s + (r.party_size ?? 1), 0);
      const virtual = virtualYes.reduce((s, r) => s + (r.party_size ?? 1), 0);

      if (!alive) return;
      setEvent({ requested, confirmed, virtual });

      if (showPersonal) {
        const myInviters = inviterRows.filter(
          (r) => r.host_id && personalHostIds!.includes(r.host_id) && r.active !== false,
        );
        const myQuota = myInviters.reduce((s, r) => s + (r.quota ?? 0), 0);
        const pendingRequest = myInviters
          .map((r) => r.requested_quota)
          .filter((v): v is number => typeof v === "number")
          .reduce<number | null>((acc, v) => (acc == null ? v : Math.max(acc, v)), null);

        const { data: myInvites } = await supabase
          .from("invitations")
          .select("id,host_id")
          .in("host_id", personalHostIds!);
        const uploaded = (myInvites ?? []).length;
        const myInviteIds = new Set((myInvites ?? []).map((i) => i.id));
        const myConfirmed = inPersonYes
          .filter((r) => myInviteIds.has(r.invitation_id))
          .reduce((s, r) => s + (r.party_size ?? 1), 0);
        const myVirtual = virtualYes
          .filter((r) => myInviteIds.has(r.invitation_id))
          .reduce((s, r) => s + (r.party_size ?? 1), 0);

        if (!alive) return;
        setMine({ requested: myQuota, uploaded, confirmed: myConfirmed, virtual: myVirtual, pendingRequest });
        setMyInviterIds(myInviters.map((r) => r.id));
      }

      if (alive) setLoading(false);
    };
    void load();

    const ch = supabase
      .channel("rsvp-totals")
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "inviters" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "invitations" }, () => void load())
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [showPersonal, JSON.stringify(personalHostIds ?? [])]); // eslint-disable-line react-hooks/exhaustive-deps

  const available = Math.max(0, event.requested - event.confirmed);
  const pct =
    event.requested > 0 ? Math.min(100, Math.round((event.confirmed / event.requested) * 100)) : 0;
  const myAvailable = Math.max(0, mine.requested - mine.confirmed);
  const overUploaded = mine.uploaded > mine.requested;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <NewBadge target="committee:rsvp-totals-card" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">RSVP totals</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}% filled</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Stat label="Total seats" value={TOTAL_SEATS} />
        <Stat label="RSVP requests" value={loading ? "—" : event.requested} />
        <Stat label="RSVPs available" value={loading ? "—" : available} />
        <Stat label="In-person confirmed" value={loading ? "—" : event.confirmed} emphasis />
      </div>

      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-terracotta transition-all"
          style={{ width: `${pct}%` }}
          aria-label={`${pct} percent filled`}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        RSVP Zooms:{" "}
        <span className="font-semibold text-ink tabular-nums">
          {loading ? "—" : event.virtual}
        </span>
        {" — unlimited, doesn't use seats."}
      </p>

      {showPersonal && (
        <div className="pt-3 border-t space-y-3">
          <div className="flex items-center gap-1.5">
            <NewBadge target="committee:my-rsvp-label" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">My RSVPs</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Stat
              label="My RSVP request"
              value={loading ? "—" : mine.requested}
              sub={mine.pendingRequest != null ? `Pending: ${mine.pendingRequest}` : undefined}
            />
            <Stat
              label="My guests uploaded"
              value={loading ? "—" : mine.uploaded}
              sub={overUploaded ? `Requested: ${mine.requested}` : undefined}
              warn={overUploaded}
            />
            <Stat label="My in-person RSVPs" value={loading ? "—" : mine.confirmed} emphasis />
            <Stat label="My RSVPs left" value={loading ? "—" : myAvailable} />
          </div>
          <p className="text-xs text-muted-foreground">
            My RSVP Zooms:{" "}
            <span className="font-semibold text-ink tabular-nums">
              {loading ? "—" : mine.virtual}
            </span>
            {" — unlimited, doesn't use seats."}
          </p>
          {myInviterIds.length > 0 && (
            <RequestMoreButton
              inviterIds={myInviterIds}
              currentQuota={mine.requested}
              pendingRequest={mine.pendingRequest}
            />
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic leading-relaxed">
        Only in-person RSVPs count. Not everyone you invite will say yes, so plan to invite
        more guests than your RSVP request amount.
      </p>
    </Card>
  );
}

function Stat({
  label,
  value,
  emphasis,
  sub,
  warn,
}: {
  label: string;
  value: number | string;
  emphasis?: boolean;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-display tabular-nums ${emphasis ? "text-3xl text-terracotta" : "text-2xl"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      {sub && (
        <p className={`mt-0.5 text-[10px] ${warn ? "text-brand-red font-semibold" : "text-muted-foreground"}`}>{sub}</p>
      )}
    </div>
  );
}

function RequestMoreButton({
  inviterIds,
  currentQuota,
  pendingRequest,
}: {
  inviterIds: string[];
  currentQuota: number;
  pendingRequest: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(pendingRequest ?? currentQuota + 10);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(pendingRequest ?? currentQuota + 10);
      setNote("");
    }
  }, [open, currentQuota, pendingRequest]);

  const submit = async () => {
    if (!amount || amount < 1) {
      toast.error("Enter a number of RSVPs to request");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("inviters")
        .update({
          requested_quota: amount,
          quota_request_note: note.trim() || null,
          quota_requested_at: new Date().toISOString(),
        })
        .in("id", inviterIds);
      if (error) throw error;
      toast.success(`Requested ${amount} RSVPs. Admin will review.`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {pendingRequest != null ? `Update request (${pendingRequest} pending)` : "Request more RSVPs"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request more RSVPs</DialogTitle>
          <DialogDescription>
            Your current approved amount is {currentQuota}. Ask the admin to raise it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="req-amount">New requested amount</Label>
            <Input
              id="req-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="req-note">Note for admin (optional)</Label>
            <Textarea
              id="req-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why you'd like more RSVPs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Sending…" : "Send request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
