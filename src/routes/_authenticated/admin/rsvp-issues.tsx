import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  assignRsvpReferrer,
  listRsvpIssues,
  type RsvpFailure,
  type RsvpIntegrityIssue,
  type RsvpNeedsReferrer,
} from "@/lib/rsvp-issues.functions";

export const Route = createFileRoute("/_authenticated/admin/rsvp-issues")({
  head: () => ({
    meta: [
      { title: "Replies that didn't stick — Taste of Conventions" },
      {
        name: "description",
        content:
          "Admin view of RSVP replies that were rejected or landed without a credited committee member.",
      },
      { property: "og:title", content: "Replies that didn't stick" },
      {
        property: "og:description",
        content: "Rejected RSVP submissions and replies needing a referrer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RsvpIssuesPage,
});

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

function RsvpIssuesPage() {
  const load = useServerFn(listRsvpIssues);
  const assign = useServerFn(assignRsvpReferrer);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<RsvpFailure[]>([]);
  const [needsReferrer, setNeedsReferrer] = useState<RsvpNeedsReferrer[]>([]);
  const [inviters, setInviters] = useState<{ id: string; name: string }[]>([]);
  const [integrity, setIntegrity] = useState<RsvpIntegrityIssue[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load({ data: {} as never });
      setFailures(res.failures);
      setNeedsReferrer(res.needsReferrer);
      setInviters(res.inviters);
      setIntegrity(res.integrity);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't load the list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAssign = async (row: RsvpNeedsReferrer, inviterId: string) => {
    if (!inviterId) return;
    setBusy(row.invitation_id);
    try {
      const res = await assign({ data: { invitationId: row.invitation_id, inviterId } });
      if (res.ok) {
        toast.success(`Credited to ${res.owner ?? "committee member"}`);
        await refresh();
      } else {
        toast.error("That assignment did not save — try again");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save that");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 px-3 py-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Replies that didn't stick</h1>
        <p className="text-sm text-muted-foreground">
          Anyone who says "I RSVP'd" but shows as pending will appear here — either their submission
          was rejected, or it saved without a committee member credited.
        </p>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          Rejected submissions ({failures.length})
        </h2>
        {failures.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            No rejected submissions recorded. From now on, every refused reply is logged here.
          </p>
        )}
        {failures.map((f) => (
          <Card key={f.id} className="p-3 text-sm">
            <div className="font-medium">{f.guest_name ?? "Name not captured"}</div>
            <div className="text-muted-foreground">
              {f.guest_phone ?? "No phone captured"} · said{" "}
              {f.status === "yes" ? "yes" : f.status === "no" ? "no" : (f.status ?? "—")} ·{" "}
              {f.party_size ?? "—"} people · {f.attendance_mode ?? "—"}
            </div>
            <div className="mt-1">
              Typed as their referrer: <strong>{f.invited_by_raw ?? "—"}</strong>
            </div>
            <div className="mt-1 text-destructive">{f.reason ?? "Unknown reason"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {fmt(f.created_at)} · {f.source === "public" ? "public RSVP page" : "invite link"}
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Data integrity review ({integrity.length})</h2>
        {integrity.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No RSVP, ownership, or meal-link exceptions found.</p>
        )}
        {integrity.map((issue, index) => (
          <Card key={`${issue.kind}-${issue.invitation_id ?? index}`} className="p-3 text-sm">
            <div className="font-medium">{issue.guest_name}</div>
            <div className="mt-1 text-destructive">{issue.detail}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {issue.kind === "meal_without_attending_rsvp"
                ? "Meal / RSVP mismatch"
                : issue.kind === "owner_without_account"
                  ? "Committee account link missing"
                  : "Meal invitation link missing"}
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          Needs referrer confirmation ({needsReferrer.length})
        </h2>
        {needsReferrer.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Every reply is credited to a committee member.
          </p>
        )}
        {needsReferrer.map((r) => (
          <Card key={r.invitation_id} className="p-3 text-sm">
            <div className="font-medium">{r.guest_name}</div>
            <div className="text-muted-foreground">
              {r.guest_phone ?? "No phone"} · {r.status} · {r.party_size ?? "—"} people ·{" "}
              {fmt(r.responded_at)}
            </div>
            <div className="mt-1">
              They typed: <strong>{r.invited_by_raw ?? "nothing"}</strong>
            </div>
            <label className="mt-2 block text-xs text-muted-foreground" htmlFor={`a-${r.invitation_id}`}>
              Credit this guest to
            </label>
            <select
              id={`a-${r.invitation_id}`}
              className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
              disabled={busy === r.invitation_id}
              defaultValue=""
              onChange={(e) => onAssign(r, e.target.value)}
            >
              <option value="">Choose a committee member…</option>
              {inviters.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Card>
        ))}
      </section>
    </div>
  );
}
