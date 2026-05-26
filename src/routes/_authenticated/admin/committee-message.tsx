import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  MessageSquare,
  Copy,
  Users,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { getErrorMessage } from "@/lib/async-safety";

export const Route = createFileRoute("/_authenticated/admin/committee-message")({
  head: () => ({ meta: [{ title: "Committee message — A Taste of Special Conventions" }] }),
  component: CommitteeMessagePage,
});

type Guest = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  rsvp_token: string;
  invite_sent_at: string | null;
  rsvp_expires_at: string | null;
  rsvp_status: string | null;
};

const DEFAULT_TEMPLATE =
  "Hi {{first}}, it's {{sender}}. You're on the Steering Committee for A Taste of Special Conventions on Sunday, August 30, 2026. Please RSVP here (link expires in 7 days): {{link}}";

const templateKey = (uid?: string) => `committee-sms-template:${uid ?? "unknown"}`;

function renderTemplate(
  tpl: string,
  ctx: { first: string; sender: string; link: string },
) {
  return tpl
    .replaceAll("{{first}}", ctx.first)
    .replaceAll("{{sender}}", ctx.sender)
    .replaceAll("{{link}}", ctx.link);
}

function CommitteeMessagePage() {
  const { user } = useAuth();
  const { isTeam, loading: rolesLoading } = useRoles();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [senderName, setSenderName] = useState<string>("your friend");
  const [pendingOnly, setPendingOnly] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const SITE_URL =
    typeof window !== "undefined" ? window.location.origin : "https://tasteofconventions.com";

  const linkFor = (token: string) =>
    `${SITE_URL}/rsvp/${encodeURIComponent(token.trim().replace(/\+/g, "-").replace(/\//g, "_"))}`;

  // Load saved template
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const saved = window.localStorage.getItem(templateKey(user.id));
    if (saved) setTemplate(saved);
  }, [user?.id]);

  // Persist template
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    window.localStorage.setItem(templateKey(user.id), template);
  }, [user?.id, template]);

  // Load sender name
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    void (async () => {
      const [{ data: inv }, { data: profile }] = await Promise.all([
        supabase.from("inviters").select("name").eq("host_id", user.id).maybeSingle(),
        supabase.from("profiles").select("display_name,email").eq("id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setSenderName(
        inv?.name ||
          profile?.display_name ||
          (profile?.email ? profile.email.split("@")[0] : "your friend"),
      );
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select(
          "id,guest_name,guest_phone,rsvp_token,invite_sent_at,rsvp_expires_at,is_committee,rsvps(status)",
        )
        .eq("is_committee", true)
        .order("guest_name", { ascending: true });
      if (error) throw error;
      type Row = Omit<Guest, "rsvp_status"> & {
        rsvps: { status: string }[] | { status: string } | null;
      };
      setGuests(
        ((data ?? []) as unknown as Row[]).map((r) => {
          const rsvp = Array.isArray(r.rsvps) ? r.rsvps[0] : r.rsvps;
          return {
            id: r.id,
            guest_name: r.guest_name,
            guest_phone: r.guest_phone,
            rsvp_token: r.rsvp_token,
            invite_sent_at: r.invite_sent_at,
            rsvp_expires_at: r.rsvp_expires_at,
            rsvp_status: rsvp?.status ?? null,
          };
        }),
      );
    } catch (e) {
      console.error("[committee-message] load failed", e);
      toast.error("Couldn't load committee guests", { description: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rolesLoading && isTeam) void load();
  }, [rolesLoading, isTeam]);

  const visible = useMemo(() => {
    if (!pendingOnly) return guests;
    return guests.filter((g) => !g.invite_sent_at && g.rsvp_status !== "yes");
  }, [guests, pendingOnly]);

  const withPhone = useMemo(() => visible, [visible]);

  const messageFor = (g: Guest) =>
    renderTemplate(template, {
      first: (g.guest_name || "Friend").split(/\s+/)[0],
      sender: senderName || "your friend",
      link: linkFor(g.rsvp_token),
    });

  const copy = async (text: string, label = "Message copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch (e) {
      toast.error("Couldn't copy", { description: getErrorMessage(e) });
    }
  };

  const markSent = async (g: Guest, checked: boolean) => {
    setMarkingId(g.id);
    const sentAt = checked ? new Date().toISOString() : null;
    const expiresAt = checked
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const { error } = await supabase
      .from("invitations")
      .update({ invite_sent_at: sentAt })
      .eq("id", g.id);
    setMarkingId(null);
    if (error) {
      toast.error("Couldn't update", { description: error.message });
      return;
    }
    setGuests((prev) =>
      prev.map((row) =>
        row.id === g.id
          ? { ...row, invite_sent_at: sentAt, rsvp_expires_at: expiresAt }
          : row,
      ),
    );
    toast.success(checked ? "Marked as sent — 7-day window started." : "Marked as not sent.");
  };

  if (rolesLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (!isTeam) {
    return <p className="text-muted-foreground">Only committee members can use this tool.</p>;
  }

  const totalCommittee = guests.length;
  const pendingCount = guests.filter((g) => !g.invite_sent_at && g.rsvp_status !== "yes").length;
  const sentCount = guests.filter((g) => g.invite_sent_at).length;
  const yesCount = guests.filter((g) => g.rsvp_status === "yes").length;

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-terracotta" />
          <h2 className="font-display text-2xl">Committee invitation message</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          A dedicated in-app message just for committee-tagged guests. Edit the template below,
          then copy each personalized message to share however you like. Tap{" "}
          <em>Mark as delivered</em> to start the 7-day RSVP window.
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Committee</p>
          <p className="font-display text-2xl mt-1">{totalCommittee}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Not sent yet</p>
          <p className="font-display text-2xl mt-1">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Texts sent</p>
          <p className="font-display text-2xl mt-1">{sentCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">RSVP'd yes</p>
          <p className="font-display text-2xl mt-1">{yesCount}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-terracotta" />
            <p className="font-medium">Message template</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTemplate(DEFAULT_TEMPLATE)}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset to default
          </Button>
        </div>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={5}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{{first}}"}</code> (guest's first name),{" "}
          <code>{"{{sender}}"}</code> (you: <em>{senderName}</em>),{" "}
          <code>{"{{link}}"}</code> (their personal RSVP link).
        </p>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Preview
          </p>
          <p className="whitespace-pre-wrap">
            {renderTemplate(template, {
              first: "Alex",
              sender: senderName || "your friend",
              link: `${SITE_URL}/rsvp/SAMPLE`,
            })}
          </p>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-terracotta" />
            <p className="font-medium">Bulk actions</p>
          </div>
          <label className="inline-flex items-center gap-2 h-8 px-2 rounded-md border border-input text-xs cursor-pointer hover:bg-accent">
            <Checkbox
              checked={pendingOnly}
              onCheckedChange={(v) => setPendingOnly(v === true)}
            />
            <span>Show only "not sent" committee guests</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Group SMS can't personalize each name, so the bulk action sends a generic version (uses{" "}
          <em>"Hi committee,"</em> instead of <code>{"{{first}}"}</code>) to everyone visible
          below. For personalized texts, use each row's Send button.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={withPhone.length === 0}
            onClick={() => {
              const phones = withPhone
                .map((g) => (g.guest_phone ?? "").replace(/\s+/g, ""))
                .filter(Boolean)
                .join(",");
              const body =
                renderTemplate(template, {
                  first: "committee",
                  sender: senderName || "your friend",
                  link: `${SITE_URL}/rsvp/YOUR_PERSONAL_LINK`,
                }) +
                "\n\n(Heads up: your personal RSVP link was sent in an earlier text or email — use that one.)";
              window.location.href = `sms:${phones}?&body=${encodeURIComponent(body)}`;
            }}
            className="bg-ink text-cream hover:bg-ink/90"
          >
            <Send className="w-4 h-4 mr-2" /> Open group SMS ({withPhone.length})
          </Button>
          <Button
            variant="outline"
            disabled={withPhone.length === 0}
            onClick={() =>
              copy(
                withPhone
                  .map((g) => (g.guest_phone ?? "").trim())
                  .filter(Boolean)
                  .join(", "),
                "Phone numbers copied",
              )
            }
          >
            <Phone className="w-4 h-4 mr-2" /> Copy all phone numbers
          </Button>
          <Button
            variant="outline"
            disabled={visible.length === 0}
            onClick={() => {
              const lines = visible.map(
                (g) =>
                  `${g.guest_name}${g.guest_phone ? ` (${g.guest_phone})` : ""}:\n${messageFor(g)}`,
              );
              void copy(lines.join("\n\n---\n\n"), "All personalized messages copied");
            }}
          >
            <Copy className="w-4 h-4 mr-2" /> Copy all personalized messages
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-terracotta" />
            <p className="font-medium">
              Committee guests{visible.length > 0 ? ` (${visible.length})` : ""}
            </p>
            {pendingOnly && (
              <Badge variant="outline" className="text-xs">
                pending only
              </Badge>
            )}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        {visible.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            {loading
              ? "Loading…"
              : pendingOnly
                ? "All committee guests have been texted or have RSVP'd. Uncheck the filter to see the full list."
                : "No committee-tagged guests yet. Tag guests as Committee on the Add guests page."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((g) => {
              const phone = (g.guest_phone ?? "").trim();
              const body = messageFor(g);
              return (
                <div key={g.id} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{g.guest_name}</span>
                    <Badge className="bg-terracotta text-cream hover:bg-terracotta text-[10px]">
                      Committee
                    </Badge>
                    {g.rsvp_status === "yes" && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                        RSVP'd yes
                      </Badge>
                    )}
                    {g.invite_sent_at && g.rsvp_status !== "yes" && (
                      <Badge variant="outline" className="text-[10px]">
                        text sent
                      </Badge>
                    )}
                    {!g.invite_sent_at && g.rsvp_status !== "yes" && (
                      <Badge
                        variant="outline"
                        className="border-amber-400 text-amber-700 text-[10px]"
                      >
                        not sent
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {phone || <em className="text-destructive/70">no phone</em>}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded-md p-2 border border-border">
                    {body}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={!phone}
                      onClick={() => {
                        window.location.href = smsLink(phone, body);
                      }}
                      className="bg-ink text-cream hover:bg-ink/90"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Send text
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void copy(body)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
                    </Button>
                    {phone && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void copy(phone, "Phone copied")}
                      >
                        <Phone className="w-3.5 h-3.5 mr-1.5" /> Copy number
                      </Button>
                    )}
                    <label className="inline-flex items-center gap-2 h-8 px-2 rounded-md border border-input text-xs cursor-pointer hover:bg-accent ml-auto">
                      <Checkbox
                        checked={!!g.invite_sent_at}
                        disabled={markingId === g.id}
                        onCheckedChange={(v) => void markSent(g, v === true)}
                      />
                      <span>
                        {markingId === g.id
                          ? "Saving…"
                          : g.invite_sent_at
                            ? "Text sent"
                            : "I sent the text"}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
