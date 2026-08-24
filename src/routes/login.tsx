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
import { rememberLoginName, rememberLoginPhone, getRememberedLoginName, getRememberedLoginPhone, markSessionAuthoritative } from "@/lib/session-recovery";
import { NewBadge } from "@/components/new-badge";
import { markSeen } from "@/lib/whats-new";
import { ensureMyTeamRole } from "@/lib/account.functions";
import { restaurantPortalLogin } from "@/lib/restaurant-portal.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Log in to manage your RSVP and pre-orders for A Taste of Special Conventions on August 30, 2026.",
      },
    ],
  }),
  component: HelperLogin,
});

type RouteDestination = { to: "/admin" } | { to: "/admin/upload" } | { to: "/dashboard" } | { to: "/my-rsvp" } | { to: "/volunteer" };
const allowedRedirects = new Set(["/admin", "/admin/upload", "/my-rsvp", "/dashboard", "/volunteer"]);

function safeRedirect(value: string | undefined) {
  if (!value) return undefined;
  if (allowedRedirects.has(value)) return value;
  // Allow the managed OAuth consent route so external clients (e.g. ChatGPT,
  // Claude) can send users through login and back to the consent screen with
  // the same authorization_id. Same-origin relative path only.
  if (value.startsWith("/.lovable/oauth/consent")) return value;
  return undefined;
}

function normalizeMobilePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return "";
}

async function routeForUser(_userId: string, ensureRoles: () => Promise<unknown>): Promise<RouteDestination> {
  // Promote committee members to the "team" role so they see the full dashboard.
  try {
    await withTimeout(ensureRoles(), 5000);
  } catch {
    // non-fatal
  }

  try {
    // SECURITY DEFINER RPC: avoids "permission denied for table user_roles"
    // when the fresh session hasn't propagated to this client yet.
    const { data: roleData } = await withTimeout(supabase.rpc("get_my_roles"), 5000);
    const roles = (roleData ?? []).map((r) => r.role as string);
    if (roles.includes("admin") || roles.includes("team")) return { to: "/admin" };
  } catch {
    // If we can't read roles right now, fall through to the safe default
    // instead of leaving the user stuck on the login screen.
  }

  return { to: "/my-rsvp" };
}



function HelperLogin() {
  const { user, loading } = useAuth();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const phoneLogin = useServerFn(signInWithPhoneOnly);
  const ensureRoles = useServerFn(ensureMyTeamRole);
  const restaurantLogin = useServerFn(restaurantPortalLogin);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigatingRef = useRef(false);

  const goToDestination = async (userId: string) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      const destination = await routeForUser(userId, ensureRoles);
      const redirect = safeRedirect(search.redirect);
      // The managed OAuth consent route is a full URL path with query params
      // — navigate to it directly instead of the role-based destination.
      if (redirect && redirect.startsWith("/.lovable/oauth/consent")) {
        window.location.replace(redirect);
        return;
      }
      const nextTo = redirect === "/volunteer"
        ? "/volunteer"
        : redirect === "/admin/upload" && destination.to === "/admin"
          ? "/admin/upload"
          : destination.to;
      await navigate({ to: nextTo, replace: true });
    } catch {
      // Allow another attempt instead of getting wedged forever.
      navigatingRef.current = false;
    } finally {
      // Always release the button so the user is never stuck on "Signing in…".
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading || !user) return;
    void goToDestination(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  useEffect(() => {
    // A tap on "Sign in" before the page finished loading its JavaScript used
    // to submit the form the plain-HTML way: the page reloaded, the typed name
    // and number were wiped, and nothing signed in. The fields now carry form
    // names, so that early submit comes back as ?name=…&phone=… — pick those
    // up, clean them out of the address bar, and finish the sign-in for real.
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const carriedName = (params.get("name") || "").trim();
    const carriedPhone = (params.get("phone") || "").trim();
    if (carriedName || carriedPhone) {
      params.delete("name");
      params.delete("phone");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
    const nextName = carriedName || getRememberedLoginName() || "";
    const nextPhone = carriedPhone || getRememberedLoginPhone() || "";
    setName((current) => current || nextName);
    setPhone((current) => current || nextPhone);
    if (carriedName && carriedPhone && normalizeMobilePhone(carriedPhone) && carriedName.length >= 2) {
      void signIn(undefined, { phone: carriedPhone, name: carriedName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (event?: FormEvent, override?: { phone: string; name: string }) => {
    event?.preventDefault();
    const phoneValue = override?.phone ?? phone;
    const nameValue = override?.name ?? name;
    if (!normalizeMobilePhone(phoneValue)) return toast.error("Enter a valid mobile phone number");
    if (nameValue.trim().length < 2) return toast.error("Enter the last name on your invitation");
    setBusy(true);
    try {
      const session = await withTimeout(phoneLogin({ data: { phone: phoneValue, name: nameValue.trim() } }), 15000);
      if ("error" in session) {

        // Restaurant partners use the same name + phone pattern, so if the
        // guest list doesn't recognize them, try the restaurant portal before
        // telling them they're not on the list.
        try {
          const res = await withTimeout(
            restaurantLogin({ data: { restaurant: nameValue.trim(), code: phoneValue.trim() } }),
            15000,
          );
          if (res.ok) {
            toast.success("Signed in to your restaurant portal.");
            await navigate({ to: "/restaurant", replace: true });
            return;
          }
        } catch {
          /* fall through to the guest error */
        }
        setBusy(false);
        return toast.error(session.error);
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (setErr) {
        setBusy(false);
        return toast.error(setErr.message);
      }
      // This session is the freshest one that exists — protect it from being
      // replaced by a background recovery login.
      markSessionAuthoritative();
      rememberLoginPhone(phoneValue);
      rememberLoginName(nameValue.trim());

      toast.success("Signed in.");
      // Navigate using the user_id from the server response directly — don't
      // wait on getUser() (which has hung for some users) or rely solely on
      // the onAuthStateChange listener firing.
      await goToDestination(session.user_id);
    } catch (error) {
      navigatingRef.current = false;
      setBusy(false);
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-3" aria-label="A Taste of Special Conventions home">
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">A Taste of</p>
          <p className="font-display text-3xl text-ink">Special Conventions</p>
        </Link>
        <div className="text-center mb-6">
          <Link
            to="/"
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-ink underline"
          >
            ← Back to invitation
          </Link>
        </div>
        <main className="bg-card border border-border rounded-xl p-8 shadow-elegant space-y-5">
          <div className="text-center space-y-1">
            <h1 className="font-display text-2xl text-ink">Log in to your RSVP</h1>
            <p className="text-xs text-muted-foreground">
              Enter your mobile number and the last name on your invitation. Both must match.
            </p>
          </div>
          <form onSubmit={(e) => void signIn(e)} method="get" className="space-y-4">
            {search.redirect ? <input type="hidden" name="redirect" value={search.redirect} /> : null}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <NewBadge target="login:last-name" />
                <Label>Last name</Label>
              </div>
              <Input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => markSeen("login:last-name")}
                required
                autoComplete="family-name"
                placeholder="Your last name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Mobile phone number</Label>
              <Input
                type="tel"
                name="phone"
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
          <p className="text-xs text-center text-muted-foreground">
            Partner restaurant?{" "}
            <Link to="/restaurant" className="underline text-ink">
              Open the restaurant portal
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
