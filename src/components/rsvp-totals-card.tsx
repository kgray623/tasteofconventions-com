import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { NewBadge } from "@/components/new-badge";

type Totals = { requested: number; confirmed: number; virtual: number };

type Props = {
  /** When provided, also render this committee member's personal slot. */
  personalHostIds?: string[];
};

export function RsvpTotalsCard({ personalHostIds }: Props) {
  const [event, setEvent] = useState<Totals>({ requested: 0, confirmed: 0, virtual: 0 });
  const [mine, setMine] = useState<Totals>({ requested: 0, confirmed: 0, virtual: 0 });
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

      // Yes RSVPs split by attendance mode. Anything not explicitly "zoom"
      // counts as in-person (matches how the rest of the app reads it).
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
        const myQuota = (inviters ?? [])
          .filter((r) => r.host_id && personalHostIds!.includes(r.host_id) && r.active !== false)
          .reduce((s, r) => s + (r.quota ?? 0), 0);

        // Personal confirmed: invitations whose host_id is mine and have a yes rsvp
        const { data: myInvites } = await supabase
          .from("invitations")
          .select("id,host_id")
          .in("host_id", personalHostIds!);
        const myInviteIds = new Set((myInvites ?? []).map((i) => i.id));
        const myConfirmed = inPersonYes
          .filter((r) => myInviteIds.has(r.invitation_id))
          .reduce((s, r) => s + (r.party_size ?? 1), 0);
        const myVirtual = virtualYes
          .filter((r) => myInviteIds.has(r.invitation_id))
          .reduce((s, r) => s + (r.party_size ?? 1), 0);

        if (!alive) return;
        setMine({ requested: myQuota, confirmed: myConfirmed, virtual: myVirtual });
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
  const pct =
    event.requested > 0 ? Math.min(100, Math.round((event.confirmed / event.requested) * 100)) : 0;
  const myRemaining = Math.max(0, mine.requested - mine.confirmed);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">RSVP totals</p>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}% filled</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Seats requested" value={loading ? "—" : event.requested} />
        <Stat label="In-person confirmed" value={loading ? "—" : event.confirmed} emphasis />
        <Stat label="Still available" value={loading ? "—" : remaining} />
      </div>

      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-terracotta transition-all"
          style={{ width: `${pct}%` }}
          aria-label={`${pct} percent filled`}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Virtual (Zoom):{" "}
        <span className="font-semibold text-ink tabular-nums">
          {loading ? "—" : event.virtual}
        </span>
        {" — unlimited, doesn't use seats."}
      </p>

      {showPersonal && (
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <NewBadge target="committee:my-rsvp-label" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">My RSVP</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="My Guests" value={loading ? "—" : mine.requested} newTarget="committee:my-guests-label" />
            <Stat label="My In-Person" value={loading ? "—" : mine.confirmed} emphasis newTarget="committee:my-in-person-label" />
            <Stat label="My RSVPs Left" value={loading ? "—" : myRemaining} newTarget="committee:my-rsvps-left-label" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            My virtual (Zoom):{" "}
            <span className="font-semibold text-ink tabular-nums">
              {loading ? "—" : mine.virtual}
            </span>
            {" — unlimited, doesn't use seats."}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic leading-relaxed">
        Only in-person RSVPs count against your seat quota. To land{" "}
        {showPersonal && mine.requested > 0 ? mine.requested : 40} in-person RSVPs you'll usually
        need to text many more people — keep inviting until your in-person quota fills.
      </p>
    </Card>
  );
}

function Stat({
  label,
  value,
  emphasis,
  newTarget,
}: {
  label: string;
  value: number | string;
  emphasis?: boolean;
  newTarget?: string;
}) {
  return (
    <div>
      <p
        className={`font-display tabular-nums ${emphasis ? "text-3xl text-terracotta" : "text-2xl"}`}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
        {newTarget && <NewBadge target={newTarget} direction="right" className="px-2 py-0.5 text-[10px] gap-1" />}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
