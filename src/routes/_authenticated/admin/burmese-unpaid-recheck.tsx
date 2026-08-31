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
import { useBurmeseRecheck } from "@/hooks/use-burmese-recheck";
import {
  saveBurmeseRecheckTemplate,
  setBurmeseRecheckTextSent,
} from "@/lib/burmese-recheck.functions";
import { renderBurmeseRecheckText } from "@/lib/burmese-recheck-roster";
import { formatPhoneUS, digitsOnly } from "@/lib/phone";
import { smsNumber } from "@/lib/meal-text-message";

/**
 * "Burmese payment recheck": the households the Burmese restaurant owner reports
 * as unpaid against his own bank records. Tap-to-text asks each person to resend
 * their receipt. Sent marks are written only by an explicit human tap.
 */
export const Route = createFileRoute("/_authenticated/admin/burmese-unpaid-recheck")({
  head: () => ({
    meta: [
      { title: "Burmese payment recheck — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Households the Burmese restaurant reports as unpaid, ready to text for a payment receipt so the ledger can be reconciled.",
      },
      {
        property: "og:title",
        content: "Burmese payment recheck — A Taste of Special Conventions",
      },
      {
        property: "og:description",
        content:
          "Households the Burmese restaurant reports as unpaid, ready to text for a payment receipt so the ledger can be reconciled.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BurmeseRecheckPage,
});

function BurmeseRecheckPage() {
  const list = useBurmeseRecheck();
  const saveTemplate = useServerFn(saveBurmeseRecheckTemplate);
  const markSent = useServerFn(setBurmeseRecheckTextSent);
  const [busy, setBusy] = useState<string | null>(null);
  const queryClient = useQueryClient();
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

  const toggleSent = async (
    guest: { phoneNormalized: string; name: string; invitationId: string | null },
    sent: boolean,
  ) => {
    setBusy(guest.phoneNormalized);
    try {
      await markSent({
        data: {
          phoneNormalized: guest.phoneNormalized,
          guestName: guest.name,
          invitationId: guest.invitationId,
          sent,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["burmese-recheck-list"] });
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
      toast.error("The text wording cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await saveTemplate({ data: { template: next } });
      await queryClient.invalidateQueries({ queryKey: ["burmese-recheck-list"] });
      setEditing(false);
      toast.success("Wording saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? `Could not save: ${error.message}` : "Could not save wording.",
      );
    } finally {
      setSaving(false);
    }
  };

  const allNumbers = list.groups
    .flatMap((g) => g.guests.map((x) => smsNumber(x.phone)))
    .filter((n): n is string => !!n);

  return (
    <div className="space-y-4 pb-16">
      <Card className="p-3 border-terracotta/40 bg-terracotta/5">
        <h1 className="font-display text-2xl">Burmese payment recheck</h1>
        {!list.loading && !list.error && (
          <p className="font-display text-xl pt-1">
            {list.totals.sent} of {list.totals.guests} texted
          </p>
        )}
        <p className="text-sm text-muted-foreground pt-1">
          {list.loading
            ? "Reading the roster from the database…"
            : list.error
              ? `Could not load the list: ${list.error}`
              : `${list.totals.guests} households the Burmese restaurant owner reports as unpaid against his own bank records, grouped by the committee member who invited them. Nothing here changes any payment record — texting asks each person to resend their receipt or Zelle confirmation so it can be passed to the restaurant.`}
        </p>
        {!list.loading && !list.error && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline">{list.totals.guests} households</Badge>
            <Badge variant="outline">{list.totals.members} committee members</Badge>
            <Badge variant="outline">{list.totals.toSend} still to text</Badge>
            {allNumbers.length > 1 && (
              <SmsTextButton
                numbers={allNumbers}
                body={renderBurmeseRecheckText(template, "there")}
                label={`Text all ${allNumbers.length}`}
              />
            )}
          </div>
        )}
      </Card>

      <Card className="p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Text wording</h2>
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
              rows={5}
              maxLength={2000}
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
                  {group.guests.length} household{group.guests.length === 1 ? "" : "s"} ·{" "}
                  {group.sent} of {group.guests.length} texted
                </p>
              </div>
              {numbers.length > 1 && (
                <SmsTextButton
                  numbers={numbers}
                  body={renderBurmeseRecheckText(template, "there")}
                  label={`Text all ${numbers.length}`}
                />
              )}
            </div>
            <ul className="divide-y divide-border">
              {group.guests.map((guest) => {
                const number = smsNumber(guest.phone);
                return (
                  <li
                    key={guest.phoneNormalized}
                    className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm"
                  >
                    <span className="font-semibold">{guest.name}</span>
                    {guest.phone ? (
                      <a
                        href={`sms:${digitsOnly(guest.phone)}`}
                        className="font-mono underline text-muted-foreground"
                      >
                        {formatPhoneUS(guest.phone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No phone on file</span>
                    )}
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
                          body={renderBurmeseRecheckText(template, guest.name)}
                          label="Text"
                        />
                      )}
                      <Button
                        size="sm"
                        variant={guest.sentAt ? "outline" : "default"}
                        disabled={busy === guest.phoneNormalized}
                        onClick={() => void toggleSent(guest, !guest.sentAt)}
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
