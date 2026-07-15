import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type AuthorizationClient = { name?: string; redirect_uri?: string };
type AuthorizationDetails = {
  client?: AuthorizationClient | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
};
function oauthApi(): SupabaseOAuth {
  const api = (supabase.auth as unknown as { oauth?: SupabaseOAuth }).oauth;
  if (!api) throw new Error("Supabase OAuth API is not available in this client version.");
  return api;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({
        to: "/login",
        search: { redirect: next } as never,
      });
    }
  },
  loader: async ({ location }) => {
    const authorizationId =
      new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="font-display text-2xl text-ink">Could not load this authorization request</h1>
        <p className="text-muted-foreground text-sm">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as AuthorizationDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-screen bg-gradient-warm flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-elegant space-y-5">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">A Taste of</p>
          <h1 className="font-display text-2xl text-ink">
            Connect {clientName} to your account
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          This lets <strong>{clientName}</strong> use Taste of Conventions as you. It can call
          the tools this app exposes over MCP. Your existing permissions and data access rules
          still apply.
        </p>
        {details?.client?.redirect_uri ? (
          <p className="text-xs text-muted-foreground break-all">
            Redirect: {details.client.redirect_uri}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-ink text-cream hover:bg-ink/90"
            disabled={busy}
            onClick={() => void decide(true)}
          >
            {busy ? "Working…" : "Approve"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => void decide(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </main>
  );
}
