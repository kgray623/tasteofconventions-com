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
import { useCoveredDish } from "@/hooks/use-covered-dish";
import { saveCoveredDishTemplate } from "@/lib/covered-dish.functions";
import { renderCoveredDishText } from "@/lib/covered-dish.server";
import { formatPhoneUS, digitsOnly } from "@/lib/phone";
import { smsNumber } from "@/lib/meal-text-message";

/**
 * "Covered dish reminders": every guest coming in person who did NOT order a
 * catered meal, grouped under the committee member who invited them, with a
 * tappable phone number and a Text button that opens the phone's own Messages
 * app. Read-only — nothing on this page marks anything as sent.
 */
export const Route = createFileRoute("/_authenticated/admin/covered-dish")({
  head: () => ({
    meta: [
      { title: "Covered dish reminders — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Guests attending in person without a catered meal, grouped by committee member, ready to text a covered-dish reminder.",
      },
      {
        property: "og:title",
        content: "Covered dish reminders — A Taste of Special Conventions",
      },
      {
        property: "og:description",
        content:
          "Guests attending in person without a catered meal, grouped by committee member, ready to text a covered-dish reminder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoveredDishPage,
});

function CoveredDishPage() {
  const list = useCoveredDish();
  const saveTemplate = useServerFn(saveCoveredDishTemplate);
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

  const commit = async () => {
    const next = draft.trim();
    if (!next) {
      toast.error("The reminder wording cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await saveTemplate({ data: { template: next } });
      await queryClient.invalidateQueries({ queryKey: ["covered-dish-list"] });
      setEditing(false);
      toast.success("Reminder wording saved.");
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
        <h1 className="font-display text-2xl">Covered dish reminders</h1>
        <p className="text-sm text-muted-foreground pt-1">
          {list.loading
            ? "Reading the guest list from the database…"
            : list.error
              ? `Could not load the list: ${list.error}`
              : `${list.totals.guests} guests coming in person did not order a catered meal (${list.totals.seats} seats), grouped by the committee member who invited them. Guests who declined or are Zoom-only are excluded. Tap Text to open your own Messages app with the reminder ready to send.`}
        </p>
        {!list.loading && !list.error && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">{list.totals.guests} guests</Badge>
            <Badge variant="outline">{list.totals.seats} seats</Badge>
            <Badge variant="outline">{list.totals.members} committee members</Badge>
            {readAt && <Badge variant="outline">Read from the database {readAt} UTC</Badge>}
          </div>
        )}
      </Card>

      <Card className="p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Reminder wording</h2>
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void commit()} disabled={saving}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
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

      {!list.loading && !list.error && list.groups.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">
          Every guest attending in person has a catered meal on order. Nobody to remind.
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
                  {group.guests.length} guest{group.guests.length === 1 ? "" : "s"} · {group.seats}{" "}
                  seat{group.seats === 1 ? "" : "s"} with no catered meal
                </p>
              </div>
              {numbers.length > 1 && (
                <SmsTextButton
                  numbers={numbers}
                  body={renderCoveredDishText(template, "there")}
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
                    <Badge variant="outline">
                      {guest.partySize} {guest.partySize === 1 ? "seat" : "seats"}
                    </Badge>
                    {number && (
                      <SmsTextButton
                        numbers={[number]}
                        body={renderCoveredDishText(template, guest.name)}
                        label="Text"
                        className="ml-auto"
                      />
                    )}
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
