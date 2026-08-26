import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SmsTextButton } from "@/components/sms-text-button";
import { useRoles } from "@/hooks/use-roles";
import { getZoomTexts, setZoomTextSent, type ZoomTextsResult } from "@/lib/zoom-texts.functions";
import { formatPhoneUS } from "@/lib/phone";
import { smsNumber } from "@/lib/meal-text-message";

/**
 * "Zoom Attendees": every guest joining by Zoom (RSVP yes/maybe) with a Text
 * button that opens the phone's own Messages app prefilled with the meeting
 * details, plus a manual sent tracker. Nothing is auto-sent and nothing is
 * marked without an explicit tap.
 */
export const Route = createFileRoute("/_authenticated/admin/zoom-attendees")({
  head: () => ({
    meta: [
      { title: "Zoom attendees — A Taste of Special Conventions" },
      {
        name: "description",
        content: "Guests joining by Zoom, ready to text the meeting link, with a sent/not-sent tracker.",
      },
      { property: "og:title", content: "Zoom attendees — A Taste of Special Conventions" },
      {
        property: "og:description",
        content: "Guests joining by Zoom, ready to text the meeting link, with a sent/not-sent tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ZoomAttendeesPage,
});

function ZoomAttendeesPage() {
  const { isTeam, isAdmin, loading: rolesLoading } = useRoles();
  const load = useServerFn(getZoomTexts);
  const mark = useServerFn(setZoomTextSent);
  const [busy, setBusy] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["zoom-texts"],
    queryFn: async () => (await load()) as ZoomTextsResult,
    enabled: !rolesLoading && (isTeam || isAdmin),
    staleTime: 30_000,
    retry: 1,
  });

  const data = query.data ?? null;
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { total: 0, sent: 0, toSend: 0, noPhone: 0 };
  const body = data?.body ?? "";

  const withPhone = useMemo(() => rows.filter((r) => r.hasPhone), [rows]);
  const withoutPhone = useMemo(() => rows.filter((r) => !r.hasPhone), [rows]);

  const toggle = async (invitationId: string, sent: boolean) => {
    setBusy(invitationId);
    try {
      await mark({ data: { invitationId, sent } });
      await query.refetch();
      toast.success(sent ? "Marked as texted." : "Sent mark removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that mark.");
    } finally {
      setBusy(null);
    }
  };

  if (rolesLoading || query.isPending) {
    return <p className="text-muted-foreground py-6">Loading Zoom attendees…</p>;
  }
  if (query.error) {
    return (
      <p className="text-destructive py-6">
        {query.error instanceof Error ? query.error.message : "Could not load Zoom attendees."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-ink text-cream">
        <p className="text-xs uppercase tracking-[0.25em] text-cream/70">Zoom attendees</p>
        <p className="font-display text-2xl mt-1">
          {totals.sent} of {totals.total} texted
        </p>
        <p className="text-sm text-cream/80 mt-1">
          {totals.toSend} still to text
          {totals.noPhone > 0 ? ` · ${totals.noPhone} with no phone number on file` : ""}
        </p>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Message that gets sent</p>
        <Textarea readOnly value={body} rows={8} className="text-xs" />
      </Card>

      <div className="space-y-2">
        {withPhone.map((row) => (
          <Card key={row.invitationId} className="p-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">
                {row.name}{" "}
                <Badge variant="outline" className="ml-1 text-[10px] uppercase">
                  {row.status}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                <a href={`tel:${smsNumber(row.phone)}`} className="hover:text-ink">
                  {formatPhoneUS(row.phone)}
                </a>
                {" · "}
                {row.inviterName}
              </p>
              {row.sentAt ? (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Text sent {new Date(row.sentAt).toLocaleString()}
                  {row.markedByLabel ? ` · ${row.markedByLabel}` : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Not texted yet</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SmsTextButton numbers={[smsNumber(row.phone)]} body={body} label="Text" />
              <Button
                size="sm"
                variant={row.sentAt ? "outline" : "default"}
                disabled={busy === row.invitationId}
                onClick={() => void toggle(row.invitationId, !row.sentAt)}
              >
                {row.sentAt ? "Undo sent" : "Mark sent"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {withoutPhone.length > 0 && (
        <Card className="p-4 space-y-2 border-destructive/40">
          <p className="text-sm font-medium text-destructive">
            No phone number on file — cannot be texted ({withoutPhone.length})
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {withoutPhone.map((row) => (
              <li key={row.invitationId}>
                {row.name} · RSVP {row.status} · {row.inviterName}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
