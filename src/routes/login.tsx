import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — A Taste of Special Conventions" }] }),
  component: HelperLogin,
});

type RouteDestination =
  | { to: "/admin" }
  | { to: "/admin/upload" }
  | { to: "/my-rsvp" };

async function routeForUser(userId: string): Promise<RouteDestination> {
  const { data } = await withTimeout(supabase.from("user_roles").select("role").eq("user_id", userId), 5000);
  const roles = (data ?? []).map((r) => r.role as string);
  if (roles.includes("admin") || roles.includes("team")) return { to: "/admin" };
  return { to: "/my-rsvp" };
}

function HelperLogin() {
  const { user, loading } = useAuth();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const redirectToUpload = search.redirect === "/admin/upload";
    routeForUser(user.id).then((destination) => {
      const next = redirectToUpload && destination.to === "/admin" ? { to: "/admin/upload" as const } : destination;
      navigate({ to: next.to, replace: true });
    });
  }, [user, loading, search.redirect, navigate]);

  const signIn = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      }), 10000);
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      if (data.user) {
        toast.success("Signed in.");
        const destination = await routeForUser(data.user.id);
        const next = search.redirect === "/admin/upload" && destination.to === "/admin" ? { to: "/admin/upload" as const } : destination;
        navigate({ to: next.to });
        return;
      }
      setBusy(false);
      toast.error("Signed in, but we could not open your account. Please try again.");
    } catch (error) {
      setBusy(false);
      toast.error(getErrorMessage(error));
    }
  };

  const forgot = async () => {
    if (forgotBusy) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return toast.error("Enter your email first");
    setForgotBusy(true);
    try {
      const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin + "/reset-password",
      }), 10000);
      if (error) return toast.error(error.message);
      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setForgotBusy(false);
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
