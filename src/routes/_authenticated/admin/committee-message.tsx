import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import {
  getCanonicalCommitteeRoster,
  type CanonicalCommitteeMember,
} from "@/lib/committee-roster.functions";

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

type RosterMember = CanonicalCommitteeMember;

function CommitteeMessagePage() {
  const { user } = useAuth();
  const { isTeam, loading: rolesLoading } = useRoles();
  const fetchRoster = useServerFn(getCanonicalCommitteeRoster);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [senderName, setSenderName] = useState<string>("your friend");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

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
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setSenderName(
        inv?.name ||
          profile?.display_name ||
          "your friend",
      );
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const result = await fetchRoster();
      setRoster(result.roster);
      setGeneratedAt(result.generatedAt);
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
        {generatedAt && (
          <p className="px-4 py-2 border-b border-border text-xs text-muted-foreground">
            Active admin/team roles read from the database {new Date(generatedAt).toLocaleString()}.
          </p>
        )}
        {roster.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            {loading ? "Loading…" : "No committee members yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {roster.map((m) => {
              const body = messageFor(m);
              return (
                <div key={m.userId} className="p-4 space-y-2">
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
