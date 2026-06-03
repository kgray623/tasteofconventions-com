import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = { session: Session | null; user: User | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let settled = false;
    const finish = (nextSession: Session | null) => {
      if (!alive) return;
      settled = true;
      setSession(nextSession);
      setLoading(false);
    };

    // onAuthStateChange fires INITIAL_SESSION on subscribe with whatever is
    // in storage, plus TOKEN_REFRESHED / SIGNED_IN later. We never want a
    // wall-clock timeout here — on mobile, returning from another app (e.g.
    // the Messages app after sending an SMS invite) can momentarily delay
    // the initial event, and cutting it short would flip the user to a
    // signed-out state and bounce them to /login.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      finish(s);
    });

    // Best-effort eager read as a fallback in case onAuthStateChange is slow
    // to fire. Only applies if nothing has settled yet.
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!settled) finish(data.session);
      })
      .catch(() => {
        // Don't sign the user out on a transient read failure — wait for
        // onAuthStateChange instead.
      });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={{ session, user: session?.user ?? null, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
