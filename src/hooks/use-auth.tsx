import { useEffect, useRef, useState, createContext, useContext, ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { signInWithPhoneOnly } from "@/lib/auth-phone.functions";
import { forgetRememberedLoginPhone, getRememberedLoginPhone, rememberLoginPhone } from "@/lib/session-recovery";

type AuthCtx = { session: Session | null; user: User | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true });

let explicitSignOutRequested = false;

export function markExplicitSignOut() {
  explicitSignOutRequested = true;
  forgetRememberedLoginPhone();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const phoneLogin = useServerFn(signInWithPhoneOnly);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const recoveryAttemptedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let settled = false;
    const recoverRememberedSession = async () => {
      if (recoveryAttemptedRef.current) return null;
      const phone = getRememberedLoginPhone();
      if (!phone) return null;
      recoveryAttemptedRef.current = true;
      try {
        const tokens = await phoneLogin({ data: { phone } });
        const { data, error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        if (error) throw error;
        return data.session ?? null;
      } catch {
        return null;
      }
    };
    const finish = (nextSession: Session | null) => {
      if (!alive) return;
      settled = true;
      if (nextSession) recoveryAttemptedRef.current = false;
      const phone = nextSession?.user.phone || (nextSession?.user.user_metadata?.phone as string | undefined);
      if (phone) rememberLoginPhone(phone);
      sessionRef.current = nextSession;
      setSession(nextSession);
      setLoading(false);
    };

    // onAuthStateChange fires INITIAL_SESSION on subscribe with whatever is
    // in storage, plus TOKEN_REFRESHED / SIGNED_IN later. We never want a
    // wall-clock timeout here — on mobile, returning from another app (e.g.
    // the Messages app after sending an SMS invite) can momentarily delay
    // the initial event, and cutting it short would flip the user to a
    // signed-out state and bounce them to /login.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!s && !explicitSignOutRequested && getRememberedLoginPhone()) {
        setLoading(true);
        void recoverRememberedSession().then((recovered) => finish(recovered));
        return;
      }
      if (event === "SIGNED_OUT") explicitSignOutRequested = false;
      finish(s);
    });

    // Best-effort eager read as a fallback in case onAuthStateChange is slow
    // to fire. Only applies if nothing has settled yet.
    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (settled) return;
        finish(data.session ?? await recoverRememberedSession());
      })
      .catch(async () => {
        if (settled) return;
        finish(await recoverRememberedSession());
      });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={{ session, user: session?.user ?? null, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
