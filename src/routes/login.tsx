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

type RouteDestination = { to: "/admin" } | { to: "/admin/upload" } | { to: "/my-rsvp" };
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
  const { data } = await withTimeout(
    supabase.from("user_roles").select("role").eq("user_id", userId),
    5000,
  );
  const roles = (data ?? []).map((r) => r.role as string);
  if (roles.includes("admin") || roles.includes("team")) return { to: "/admin" };
  return { to: "/my-rsvp" };
}

function HelperLogin() {
  const { user, loading } = useAuth();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    const redirect = safeRedirect(search.redirect);
    routeForUser(user.id).then((destination) => {
      if (cancelled) return;
      const nextTo =
        redirect === "/admin/upload" && destination.to === "/admin"
          ? "/admin/upload"
          : destination.to;
      window.location.replace(nextTo);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, loading, search.redirect]);

  const signIn = async (event?: FormEvent) => {
    event?.preventDefault();
    const normalizedPhone = normalizeMobilePhone(phone);
    if (!normalizedPhone) return toast.error("Enter a valid mobile phone number");
    setBusy(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password,
        }),
        10000,
      );
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      if (data.user) {
        toast.success("Signed in.");
        const destination = await routeForUser(data.user.id);
        const next =
          search.redirect === "/admin/upload" && destination.to === "/admin"
            ? { to: "/admin/upload" as const }
            : destination;
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
          <p className="text-xs text-center text-muted-foreground pt-2">
            Accounts are created automatically when you RSVP.
          </p>
        </div>
      </div>
    </div>
  );
}
