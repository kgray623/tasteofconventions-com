import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Copy, Users, Loader2, RotateCcw } from "lucide-react";
import { getErrorMessage } from "@/lib/async-safety";

export const Route = createFileRoute("/_authenticated/admin/committee-message")({
  head: () => ({ meta: [{ title: "Committee message — A Taste of Special Conventions" }] }),
  component: CommitteeMessagePage,
});

const LOGIN_URL = "https://tasteofconventions.com/login";

const DEFAULT_TEMPLATE =
  "Hi {{first}}, it's {{sender}}. You're now on the Steering Committee for A Taste of Special Conventions on Sunday, August 30, 2026. Click below to log in to your new dashboard: {{link}}";

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

type RsvpStatus = "yes" | "waitlist" | "no" | null;

type RosterMember = {
  name: string;
  phoneKey: string;
  nameKey: string;
  key: string;
  rsvpStatus: RsvpStatus;
};

const normNameKey = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
const normPhoneKey = (s: string | null | undefined) => {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length >= 7 ? d.slice(-10) : "";
};

function CommitteeMessagePage() {
  const { user } = useAuth();
  const { isTeam, loading: rolesLoading } = useRoles();
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [senderName, setSenderName] = useState<string>("your friend");

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const saved = window.localStorage.getItem(templateKey(user.id));
    if (saved) setTemplate(saved);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    window.localStorage.setItem(templateKey(user.id), template);
  }, [user?.id, template]);

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

  const loadRoster = async () => {
    setLoading(true);
    try {
      const [inviters, teamInvites, committeeInvs, allInvs] = await Promise.all([
        supabase.from("inviters").select("name,phone").eq("active", true),
        supabase
          .from("team_invites")
          .select("name,phone,phone_normalized")
          .eq("role", "team"),
        supabase
          .from("invitations")
          .select("guest_name,guest_phone,guest_phone_normalized")
          .eq("is_committee", true),
        supabase
          .from("invitations")
          .select("guest_name,guest_phone,guest_phone_normalized,rsvps(status)"),
      ]);

      const sources: Array<{ name: string | null; phone: string | null }> = [];
      for (const r of (inviters.data ?? []) as Array<{ name: string | null; phone: string | null }>) {
        sources.push({ name: r.name, phone: r.phone });
      }
      for (const r of (teamInvites.data ?? []) as Array<{ name: string | null; phone: string | null; phone_normalized: string | null }>) {
        sources.push({ name: r.name, phone: r.phone_normalized || r.phone });
      }
      for (const r of (committeeInvs.data ?? []) as Array<{ guest_name: string | null; guest_phone: string | null; guest_phone_normalized: string | null }>) {
        sources.push({ name: r.guest_name, phone: r.guest_phone_normalized || r.guest_phone });
      }

      const seen = new Set<string>();
      const dedup: RosterMember[] = [];
      for (const s of sources) {
        const phoneKey = normPhoneKey(s.phone);
        const nameKey = normNameKey(s.name);
        const key = phoneKey ? `p:${phoneKey}` : nameKey ? `n:${nameKey}` : "";
        if (!key || seen.has(key)) continue;
        seen.add(key);
        dedup.push({
          name: (s.name ?? "").trim() || "Committee member",
          phoneKey,
          nameKey,
          key,
          rsvpStatus: null,
        });
      }

      // Build RSVP status map by matching invitations against the roster
      const rosterPhones = new Map<string, string>(); // phoneKey -> memberKey
      const rosterNames = new Map<string, string>(); // nameKey -> memberKey
      for (const m of dedup) {
        if (m.phoneKey) rosterPhones.set(m.phoneKey, m.key);
        if (m.nameKey) rosterNames.set(m.nameKey, m.key);
      }
      const statusByKey = new Map<string, RsvpStatus>();
      type InvRow = {
        guest_name: string | null;
        guest_phone: string | null;
        guest_phone_normalized: string | null;
        rsvps: { status: string }[] | { status: string } | null;
      };
      const rank = (s: RsvpStatus): number =>
        s === "yes" ? 3 : s === "waitlist" ? 2 : s === "no" ? 1 : 0;
      for (const r of ((allInvs.data ?? []) as unknown) as InvRow[]) {
        const rsvp = Array.isArray(r.rsvps) ? r.rsvps[0] : r.rsvps;
        const raw = rsvp?.status ?? null;
        const status: RsvpStatus =
          raw === "yes" || raw === "waitlist" || raw === "no" ? raw : null;
        if (!status) continue;
        const phoneKey = normPhoneKey(r.guest_phone_normalized || r.guest_phone);
        const nameKey = normNameKey(r.guest_name);
        const memberKey =
          (phoneKey && rosterPhones.get(phoneKey)) ||
          (nameKey && rosterNames.get(nameKey)) ||
          "";
        if (!memberKey) continue;
        const prev = statusByKey.get(memberKey) ?? null;
        if (rank(status) > rank(prev)) statusByKey.set(memberKey, status);
      }

      for (const m of dedup) {
        m.rsvpStatus = statusByKey.get(m.key) ?? null;
      }
      dedup.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, { sensitivity: "base" }),
      );
      setRoster(dedup);
    } catch (e) {
      console.error("[committee-message] roster load failed", e);
      toast.error("Couldn't load committee roster", { description: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rolesLoading && isTeam) {
      void loadRoster();
    }
  }, [rolesLoading, isTeam]);

  const messageFor = (m: RosterMember) =>
    renderTemplate(template, {
      first: (m.name || "Friend").split(/\s+/)[0],
      sender: senderName || "your friend",
      link: LOGIN_URL,
    });

  const copy = async (text: string, label = "Message copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch (e) {
      toast.error("Couldn't copy", { description: getErrorMessage(e) });
    }
  };

  if (rolesLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (!isTeam) {
    return <p className="text-muted-foreground">Only committee members can use this tool.</p>;
  }

  const statusBadge = (s: RsvpStatus) => {
    if (s === "yes")
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
          RSVP'd yes
        </Badge>
      );
    if (s === "waitlist")
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
          Waitlist
        </Badge>
      );
    if (s === "no")
      return (
        <Badge variant="outline" className="text-[10px]">
          Declined
        </Badge>
      );
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
        No RSVP yet
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-terracotta" />
          <h2 className="font-display text-2xl">Committee invitation message</h2>
        </div>
      </Card>

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
          Placeholders: <code>{"{{first}}"}</code> (member's first name),{" "}
          <code>{"{{sender}}"}</code> (you: <em>{senderName}</em>),{" "}
          <code>{"{{link}}"}</code> (login link).
        </p>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Preview
          </p>
          <p className="whitespace-pre-wrap">
            {renderTemplate(template, {
              first: "Alex",
              sender: senderName || "your friend",
              link: LOGIN_URL,
            })}
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-terracotta" />
            <p className="font-medium">Committee ({roster.length})</p>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        {roster.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            {loading ? "Loading…" : "No committee members yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {roster.map((m) => {
              const body = messageFor(m);
              return (
                <div key={m.key} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {statusBadge(m.rsvpStatus)}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded-md p-2 border border-border">
                    {body}
                  </p>
                  <div>
                    <Button size="sm" variant="outline" onClick={() => void copy(body)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
                    </Button>
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
