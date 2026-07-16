import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signInAsAiRole, listAiAccessAccounts } from "@/lib/ai-access.functions";

type RoleKey = "admin" | "committee" | "guest";

export const Route = createFileRoute("/ai-access")({
  head: () => ({
    meta: [
      { title: "AI Access — Taste of Conventions" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "One-click sign-in for AI agents into admin, committee, and guest dashboards.",
      },
    ],
  }),
  loader: () => listAiAccessAccounts(),
  component: AiAccessPage,
});

const DESCRIPTIONS: Record<RoleKey, string> = {
  admin: "Full admin dashboard — manage guests, committee, restaurants, exports, everything.",
  committee: "Committee member dashboard — invite guests, message subcommittees, track RSVPs.",
  guest: "Guest RSVP dashboard — view invitation, RSVP, pre-order cuisine.",
};

function AiAccessPage() {
  const accounts = Route.useLoaderData();
  const signIn = useServerFn(signInAsAiRole);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<RoleKey | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleSignIn = async (role: RoleKey) => {
    setBusy(role);
    try {
      const res = await signIn({ data: { role } });
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

  return (
    <div className="min-h-screen bg-gradient-warm px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">AI Access Portal</p>
          <h1 className="font-display text-3xl text-ink">Taste of Conventions — Dashboards</h1>
          <p className="text-sm text-muted-foreground">
            One-click sign-in for AI agents. Each role opens the exact dashboard a real user sees.
            Test accounts — do not share this URL publicly.
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

        <section className="bg-card border border-border rounded-xl p-5 text-xs text-muted-foreground space-y-2">
          <h3 className="font-display text-sm text-ink">Manual sign-in (for any AI or human)</h3>
          <p>
            Alternative: go to <code className="text-ink">{origin}/login</code>, enter the last name
            (e.g. <code>Admin</code>, <code>Committee</code>, <code>Guest</code>) and the phone number
            listed above.
          </p>
          <p>
            After sign-in, the dashboard URLs are:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Admin → <code>{origin}/admin</code></li>
            <li>Committee → <code>{origin}/admin</code> (committee view)</li>
            <li>Guest → <code>{origin}/my-rsvp</code></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
