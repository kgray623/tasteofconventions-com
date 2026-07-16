import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Project-specific replacement for the generated attachSupabaseAuth.
// Waits briefly for the Supabase session to hydrate (or refresh) so that
// server functions guarded by requireSupabaseAuth don't 401 with
// "No authorization header provided" on cold navigations / after tab wake.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    for (let i = 0; i < 15; i++) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
      if (token) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!token) {
      // Try one explicit refresh before giving up.
      const { data } = await supabase.auth.refreshSession();
      token = data.session?.access_token;
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
