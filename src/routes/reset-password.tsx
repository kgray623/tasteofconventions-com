import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — A Taste of Special Conventions" }] }),
  component: ResetPasswordPage,
});

function getAuthParam(name: string) {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.get(name) ?? hash.get(name);
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const prepareSession = async () => {
      const code = getAuthParam("code");
      const accessToken = getAuthParam("access_token");
      const refreshToken = getAuthParam("refresh_token");
      const recoveryEmail = getAuthParam("email");
      const recoveryToken = getAuthParam("token");

      if (code) await supabase.auth.exchangeCodeForSession(code);
      if (accessToken && refreshToken)
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (recoveryEmail) setEmail(recoveryEmail);
      if (recoveryToken) setToken(recoveryToken);

      if (active) setReady(true);
    };
    prepareSession().catch((error) => {
      toast.error(error?.message ?? "This reset link could not be opened.");
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");

    setBusy(true);
    if (token && email) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "recovery",
      });
      if (verifyError) {
        setBusy(false);
        return toast.error(
          "This reset link is invalid or expired. Please request a new password reset email.",
        );
      }
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Password updated. You can log in now.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">A Taste of</p>
          <h1 className="font-display text-3xl text-ink">Special Conventions</h1>
        </Link>
        <div className="bg-card border border-border rounded-xl p-8 shadow-elegant space-y-5">
          <div className="text-center space-y-1">
            <h2 className="font-display text-2xl text-ink">Reset password</h2>
            <p className="text-sm text-muted-foreground">
              Create a new password for your RSVP account.
            </p>
          </div>
          <form onSubmit={updatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              disabled={!ready || busy}
              className="w-full bg-ink text-cream hover:bg-ink/90"
            >
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
          <Link
            to="/login"
            className="block text-xs text-center text-muted-foreground hover:text-ink underline"
          >
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
