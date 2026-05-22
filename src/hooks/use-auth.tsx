import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async-safety";

type AuthCtx = { session: Session | null; user: User | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const finish = (nextSession: Session | null) => {
      if (!alive) return;
      setSession(nextSession);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      finish(s);
    });

    withTimeout(supabase.auth.getSession(), 2500)
      .then(({ data }) => finish(data.session))
      .catch(() => finish(null));

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={{ session, user: session?.user ?? null, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
