import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { getErrorMessage, withTimeout } from "@/lib/async-safety";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [tokenHash, setTokenHash] = useState<string | null>(null);
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
      const recoveryTokenHash = getAuthParam("token_hash");

      if (code) await withTimeout(supabase.auth.exchangeCodeForSession(code), 10000);
      if (accessToken && refreshToken)
        await withTimeout(supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }), 10000);
      if (recoveryEmail) setEmail(recoveryEmail);
      if (recoveryToken) setToken(recoveryToken);
      if (recoveryTokenHash) setTokenHash(recoveryTokenHash);

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
    try {
      if (tokenHash || (token && email)) {
        const { error: verifyError } = await withTimeout(
          supabase.auth.verifyOtp(
            tokenHash
              ? { token_hash: tokenHash, type: "recovery" }
              : {
                  email,
                  token: token!,
                  type: "recovery",
                },
          ),
          10000,
        );
        if (verifyError) {
          return toast.error(
            "This reset link is invalid or expired. Please request a new password reset email.",
          );
        }
      }

      const { error } = await withTimeout(supabase.auth.updateUser({ password }), 10000);
      if (error) return toast.error(error.message);
      toast.success("Password updated. You can log in now.");
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-ink"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
