import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SmsTextButton } from "@/components/sms-text-button";
import { useAlbumTexts } from "@/hooks/use-album-texts";
import { saveAlbumTextTemplate, setAlbumTextSent } from "@/lib/album-texts.functions";
import { renderAlbumText } from "@/lib/album-text";
import { formatPhoneUS } from "@/lib/phone";
import { smsNumber } from "@/lib/meal-text-message";

/**
 * "Photo album announcement": everyone who attended, in person or on Zoom, with
 * a Text button that opens the phone's own Messages app prefilled with the album
 * instructions, plus a manual sent tracker. Nothing is auto-sent and nothing is
 * marked without an explicit tap.
 */
export const Route = createFileRoute("/_authenticated/admin/album-texts")({
  head: () => ({
    meta: [
      { title: "Photo album texts — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Text every guest who attended, in person or on Zoom, the instructions for the shared photo and video album, with a sent/not-sent tracker.",
      },
      { property: "og:title", content: "Photo album texts — A Taste of Special Conventions" },
      {
        property: "og:description",
        content:
          "Text every guest who attended, in person or on Zoom, the instructions for the shared photo and video album, with a sent/not-sent tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AlbumTextsPage,
});

function AlbumTextsPage() {
  const list = useAlbumTexts();
  const saveTemplate = useServerFn(saveAlbumTextTemplate);
  const markSent = useServerFn(setAlbumTextSent);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const template = list.template;
  const readAt = useMemo(
    () =>
      list.generatedAt
        ? new Date(list.generatedAt).toISOString().replace("T", " ").slice(11, 16)
        : null,
    [list.generatedAt],
  );

  const toggleSent = async (invitationId: string, sent: boolean) => {
    setBusy(invitationId);
    try {
      await markSent({ data: { invitationId, sent } });
      await queryClient.invalidateQueries({ queryKey: ["album-text-list"] });
      toast.success(sent ? "Marked as texted." : "Sent mark removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that mark.");
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    const next = draft.trim();
    if (!next) {
      toast.error("The message wording cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await saveTemplate({ data: { template: next } });
      await queryClient.invalidateQueries({ queryKey: ["album-text-list"] });
      setEditing(false);
      toast.success("Message wording saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? `Could not save: ${error.message}` : "Could not save wording.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <Card className="p-3 border-terracotta/40 bg-terracotta/5">
        <h1 className="font-display text-2xl">Photo album texts</h1>
        {!list.loading && !list.error && (
          <p className="font-display text-xl pt-1">
            {list.totals.sent} of {list.totals.guests} texted
          </p>
        )}
        <p className="text-sm text-muted-foreground pt-1">
          {list.loading
            ? "Reading the guest list from the database…"
            : list.error
              ? `Could not load the list: ${list.error}`
              : "Every guest who RSVP'd yes — in person and Zoom together, in one list. Duplicate phone numbers are only listed once. Tap Text to open your own Messages app with the album instructions ready to send, then tap Mark sent."}
        </p>
        {!list.loading && !list.error && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">{list.totals.guests} yes RSVPs</Badge>
            <Badge variant="outline">{list.totals.inPerson} in person</Badge>
            <Badge variant="outline">{list.totals.zoom} Zoom</Badge>
            <Badge variant="outline">{list.totals.toSend} still to text</Badge>
            {list.totals.noPhone > 0 && (
              <Badge variant="outline">{list.totals.noPhone} with no phone on file</Badge>
            )}
            {readAt && <Badge variant="outline">Read from the database {readAt} UTC</Badge>}
          </div>
        )}
      </Card>


      <Card className="p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Message wording</h2>
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void commit()} disabled={saving}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(template);
                setEditing(true);
              }}
            >
              Edit wording
            </Button>
          )}
        </div>
        {editing ? (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={16}
              maxLength={4000}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {"{name}"} is replaced with the guest's first name.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{template}</p>
        )}
      </Card>

      {!list.loading && !list.error && list.groups.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">
          No attending guests found to text.
        </Card>
      )}

      {list.groups.map((group) => {
        const numbers = group.guests
          .map((g) => smsNumber(g.phone))
          .filter((n): n is string => !!n);
        return (
          <div key={group.inviterId ?? "__none__"} className="border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div>
                <h2 className="font-semibold">{group.inviterName}</h2>
                <p className="text-xs text-muted-foreground">
                  {group.guests.length} guest{group.guests.length === 1 ? "" : "s"} · {group.sent} of{" "}
                  {group.guests.length} texted
                </p>
              </div>
              {numbers.length > 1 && (
                <SmsTextButton
                  numbers={numbers}
                  body={renderAlbumText(template, "there")}
                  label={`Text all ${numbers.length}`}
                />
              )}
            </div>
            <ul className="divide-y divide-border">
              {group.guests.map((guest) => {
                const number = smsNumber(guest.phone);
                return (
                  <li
                    key={guest.invitationId}
                    className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm"
                  >
                    <span className="font-semibold">{guest.name}</span>
                    {guest.hasPhone ? (
                      <a
                        href={`sms:${number}`}
                        className="font-mono underline text-muted-foreground"
                      >
                        {formatPhoneUS(guest.phone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No phone on file</span>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {guest.audience === "zoom"
                        ? "Zoom"
                        : guest.audience === "no_reply"
                          ? "No reply"
                          : "In person"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {guest.status}
                    </Badge>

                    {guest.sentAt ? (
                      <span className="text-xs text-emerald-700 w-full">
                        Text sent {new Date(guest.sentAt).toLocaleString()}
                        {guest.markedByLabel ? ` · ${guest.markedByLabel}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground w-full">Not texted yet</span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {number && (
                        <SmsTextButton
                          numbers={[number]}
                          body={renderAlbumText(template, guest.name)}
                          label="Text"
                        />
                      )}
                      <Button
                        size="sm"
                        variant={guest.sentAt ? "outline" : "default"}
                        disabled={busy === guest.invitationId}
                        onClick={() => void toggleSent(guest.invitationId, !guest.sentAt)}
                      >
                        {guest.sentAt ? "Undo sent" : "Mark sent"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
