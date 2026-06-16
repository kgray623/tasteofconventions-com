import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Totals = { requested: number; confirmed: number };

type Props = {
  /** When provided, also render this committee member's personal slot. */
  personalHostIds?: string[];
};

export function RsvpTotalsCard({ personalHostIds }: Props) {
  const [event, setEvent] = useState<Totals>({ requested: 0, confirmed: 0 });
  const [mine, setMine] = useState<Totals>({ requested: 0, confirmed: 0 });
  const [loading, setLoading] = useState(true);

  const showPersonal = Array.isArray(personalHostIds) && personalHostIds.length > 0;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      // Event-wide requested = sum of active inviters' quotas
      const { data: inviters } = await supabase
        .from("inviters")
        .select("quota,active,host_id");
      const requested = (inviters ?? []).reduce(
        (sum, r) => sum + (r.active === false ? 0 : r.quota ?? 0),
        0,
      );

      // Event-wide confirmed = sum of party_size where status = yes
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("party_size,status,invitation_id");
      const yesRsvps = (rsvps ?? []).filter((r) => r.status === "yes");
      const confirmed = yesRsvps.reduce((s, r) => s + (r.party_size ?? 1), 0);

      if (!alive) return;
      setEvent({ requested, confirmed });

      if (showPersonal) {
        const myQuota = (inviters ?? [])
          .filter((r) => r.host_id && personalHostIds!.includes(r.host_id) && r.active !== false)
          .reduce((s, r) => s + (r.quota ?? 0), 0);

        // Personal confirmed: invitations whose host_id is mine and have a yes rsvp
        const { data: myInvites } = await supabase
          .from("invitations")
          .select("id,host_id")
          .in("host_id", personalHostIds!);
        const myInviteIds = new Set((myInvites ?? []).map((i) => i.id));
        const myConfirmed = yesRsvps
          .filter((r) => myInviteIds.has(r.invitation_id))
          .reduce((s, r) => s + (r.party_size ?? 1), 0);

        if (!alive) return;
        setMine({ requested: myQuota, confirmed: myConfirmed });
      }

      if (alive) setLoading(false);
    };
    void load();

    const ch = supabase
      .channel("rsvp-totals")
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "inviters" }, () => void load())
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [showPersonal, JSON.stringify(personalHostIds ?? [])]); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = Math.max(0, event.requested - event.confirmed);
  const pct = event.requested > 0 ? Math.min(100, Math.round((event.confirmed / event.requested) * 100)) : 0;
  const myRemaining = Math.max(0, mine.requested - mine.confirmed);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">RSVP totals</p>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}% filled</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Seats requested" value={loading ? "—" : event.requested} />
        <Stat label="RSVPs confirmed" value={loading ? "—" : event.confirmed} emphasis />
        <Stat label="Still available" value={loading ? "—" : remaining} />
      </div>

      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-terracotta transition-all"
          style={{ width: `${pct}%` }}
          aria-label={`${pct} percent filled`}
        />
      </div>

      {showPersonal && (
        <div className="pt-3 border-t">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">My slot</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="My quota" value={loading ? "—" : mine.requested} />
            <Stat label="My RSVPs" value={loading ? "—" : mine.confirmed} emphasis />
            <Stat label="Mine left" value={loading ? "—" : myRemaining} />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic leading-relaxed">
        Invites aren't RSVPs. To land {showPersonal && mine.requested > 0 ? mine.requested : 40} RSVPs you'll usually
        need to text many more people — keep inviting until your quota fills.
      </p>
    </Card>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: number | string; emphasis?: boolean }) {
  return (
    <div>
      <p className={`font-display tabular-nums ${emphasis ? "text-3xl text-terracotta" : "text-2xl"}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
