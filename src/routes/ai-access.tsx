import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signInAsAiRole, listAiAccessAccounts } from "@/lib/ai-access.functions";

type RoleKey = "admin" | "committee" | "guest";

type AccessAccount = {
  role: string;
  displayName: string;
  phone: string;
  landing: string;
};

export const Route = createFileRoute("/ai-access")({
  head: () => ({
    meta: [
      { title: "AI Access — Taste of Conventions" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Gated one-click sign-in for authorized AI agents.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    key: typeof search.key === "string" ? search.key : "",
  }),
  component: AiAccessPage,
});

const DESCRIPTIONS: Record<RoleKey, string> = {
  admin: "Full admin dashboard — manage guests, committee, restaurants, exports, everything.",
  committee: "Committee member dashboard — invite guests, message subcommittees, track RSVPs.",
  guest: "Guest RSVP dashboard — view invitation, RSVP, pre-order cuisine.",
};

function AiAccessPage() {
  const { key } = Route.useSearch();
  const listAccounts = useServerFn(listAiAccessAccounts);
  const signIn = useServerFn(signInAsAiRole);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<RoleKey | null>(null);
  const [origin, setOrigin] = useState("");
  const [accounts, setAccounts] = useState<AccessAccount[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!key) {
      setLoadError("Missing access key. Append ?key=YOUR_SECRET to this URL.");
      return;
    }
    listAccounts({ data: { key } })
      .then((res) => setAccounts(res))
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Access denied."),
      );
  }, [key, listAccounts]);

  const handleSignIn = async (role: RoleKey) => {
    if (!key) return;
    setBusy(role);
    try {
      const res = await signIn({ data: { role, key } });
      const { error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (error) throw new Error(error.message);
      toast.success(`Signed in as ${res.display_name}`);
      await navigate({ to: res.landing, replace: true });
    } catch (err) {
      setBusy(null);
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-warm px-6 py-12">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center space-y-2">
          <h1 className="font-display text-xl text-ink">AI Access Portal</h1>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!accounts) {
    return (
      <div className="min-h-screen bg-gradient-warm px-6 py-12 text-center text-sm text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">AI Access Portal</p>
          <h1 className="font-display text-3xl text-ink">Taste of Conventions — Dashboards</h1>
          <p className="text-sm text-muted-foreground">
            Gated one-click sign-in for authorized AI agents.
          </p>
        </header>

        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.role}
              className="bg-card border border-border rounded-xl p-5 shadow-elegant space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-ink capitalize">{acc.role} dashboard</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {DESCRIPTIONS[acc.role as RoleKey]}
                  </p>
                </div>
                <Button
                  onClick={() => handleSignIn(acc.role as RoleKey)}
                  disabled={busy !== null}
                  className="bg-ink text-cream hover:bg-ink/90 shrink-0"
                >
                  {busy === acc.role ? "Signing in…" : "Sign in"}
                </Button>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-ink">{acc.displayName}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="text-ink">{acc.phone}</dd>
                <dt className="text-muted-foreground">Landing</dt>
                <dd className="text-ink">
                  {origin}
                  {acc.landing}
                </dd>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
