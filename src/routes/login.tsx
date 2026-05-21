import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — A Taste of Special Conventions" }] }),
  component: HelperLogin,
});

type RouteDestination =
  | { to: "/admin" }
  | { to: "/rsvp/preview" }
  | { to: "/rsvp/$token"; params: { token: string } };

async function routeForUser(userId: string, email?: string | null): Promise<RouteDestination> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (roles.includes("admin") || roles.includes("team")) return { to: "/admin" };
  if (email) {
    const { data: invitation } = await supabase
      .from("invitations")
      .select("rsvp_token")
      .eq("guest_email_normalized", email.trim().toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (invitation?.rsvp_token)
      return { to: "/rsvp/$token", params: { token: invitation.rsvp_token } };
  }
  return { to: "/rsvp/preview" };
}

function destinationPath(destination: RouteDestination) {
  if (destination.to === "/rsvp/$token") {
    return `/rsvp/${encodeURIComponent(destination.params.token)}`;
  }
  return destination.to;
}

function openDestination(destination: RouteDestination, replace = false) {
  const path = destinationPath(destination);
  if (replace) window.location.replace(path);
  else window.location.assign(path);
}

function HelperLogin() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    routeForUser(user.id, user.email).then((destination) => openDestination(destination, true));
  }, [user, loading]);

  const signIn = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    if (data.user) {
      toast.success("Signed in. Opening your admin area…");
      openDestination(await routeForUser(data.user.id, data.user.email));
      return;
    }
    setBusy(false);
    toast.error("Signed in, but we could not open your account. Please try again.");
  };

  const forgot = async () => {
    if (forgotBusy) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return toast.error("Enter your email first");
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setForgotBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent.");
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
          </div>
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-ink text-cream hover:bg-ink/90"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <button
            onClick={forgot}
            disabled={forgotBusy}
            className="text-xs text-muted-foreground hover:text-ink underline w-full text-center disabled:opacity-60"
          >
            {forgotBusy ? "Sending reset email…" : "Forgot password?"}
          </button>
          <p className="text-xs text-center text-muted-foreground pt-2">
            Accounts are created automatically when you RSVP.
          </p>
        </div>
      </div>
    </div>
  );
}
