import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";
import { signInWithPhoneOnly } from "@/lib/auth-phone.functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — A Taste of Special Conventions" }] }),
  component: HelperLogin,
});

type RouteDestination = { to: "/admin" } | { to: "/admin/upload" } | { to: "/dashboard" } | { to: "/my-rsvp" };
const allowedRedirects = new Set(["/admin", "/admin/upload", "/my-rsvp", "/dashboard"]);

function safeRedirect(value: string | undefined) {
  return value && allowedRedirects.has(value) ? value : undefined;
}

function normalizeMobilePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return "";
}

async function routeForUser(userId: string): Promise<RouteDestination> {
  // Promote committee members to the "team" role so they see the full dashboard.
  try {
    await withTimeout(supabase.rpc("ensure_committee_team_role"), 5000);
  } catch {
    // non-fatal
  }

  const { data: roleData } = await withTimeout(
    supabase.from("user_roles").select("role").eq("user_id", userId),
    5000,
  );
  const roles = (roleData ?? []).map((r) => r.role as string);
  if (roles.includes("admin") || roles.includes("team")) return { to: "/admin" };

  return { to: "/my-rsvp" };
}



function HelperLogin() {
  const { user, loading } = useAuth();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const phoneLogin = useServerFn(signInWithPhoneOnly);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const navigatingRef = useRef(false);

  const goToDestination = async (userId: string) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    const destination = await routeForUser(userId);
    const redirect = safeRedirect(search.redirect);
    const nextTo =
      redirect === "/admin/upload" && destination.to === "/admin"
        ? "/admin/upload"
        : destination.to;
    await navigate({ to: nextTo, replace: true });
  };

  useEffect(() => {
    if (loading || !user) return;
    void goToDestination(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  const signIn = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!normalizeMobilePhone(phone)) return toast.error("Enter a valid mobile phone number");
    setBusy(true);
    try {
      const session = await withTimeout(phoneLogin({ data: { phone } }), 15000);
      const { error: setErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (setErr) {
        setBusy(false);
        return toast.error(setErr.message);
      }
      const { data: verified, error: verifyErr } = await withTimeout(supabase.auth.getUser(), 10000);
      if (verifyErr || !verified.user) {
        throw new Error(verifyErr?.message || "Sign-in did not finish. Please try again.");
      }
      toast.success("Signed in.");
      await goToDestination(verified.user.id);
    } catch (error) {
      navigatingRef.current = false;
      setBusy(false);
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-3">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">A Taste of</p>
          <h1 className="font-display text-3xl text-ink">Special Conventions</h1>
        </Link>
        <div className="text-center mb-6">
          <Link
            to="/"
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-ink underline"
          >
            ← Back to invitation
          </Link>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 shadow-elegant space-y-5">
          <div className="text-center space-y-1">
            <h2 className="font-display text-2xl text-ink">Log in</h2>
            <p className="text-xs text-muted-foreground">
              Enter your mobile number. We'll recognize you from your invitation.
            </p>
          </div>
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mobile phone number</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="(555) 123-4567"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              onClick={(e) => {
                // Fallback in case form submit doesn't fire (e.g. mobile keyboard dismissal swallowing the first tap)
                if (!busy) {
                  e.preventDefault();
                  void signIn();
                }
              }}
              className="w-full bg-ink text-cream hover:bg-ink/90"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground pt-2">
            Don't see your account? You need to be on the invitation list first.
          </p>
        </div>
      </div>
    </div>
  );
}
