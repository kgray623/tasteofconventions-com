import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  isRecoveryServerLoginAllowed,
  isSessionRecoveryActive,
  waitForSessionRecovery,
} from "@/lib/session-recovery";

// Project-specific replacement for the generated attachSupabaseAuth.
// Waits briefly for the Supabase session to hydrate (or refresh) so that
// server functions guarded by requireSupabaseAuth don't 401 with
// "No authorization header provided" on cold navigations / after tab wake.

// A tab left open across a rebuild keeps the previous build's server-function
// IDs. The new server rejects them ("Invalid server function ID") and every
// call 500s until the page reloads, which looked like a blank screen. Reload
// the tab once so the fresh bundle takes over instead of failing forever.
const STALE_RELOAD_KEY = "tss-stale-serverfn-reload";

function isStaleServerFnError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (() => {
            const maybe = error as { message?: unknown; error?: unknown } | null;
            const value = maybe?.message ?? maybe?.error;
            return typeof value === "string" ? value : "";
          })();
  return message.includes("Invalid server function ID");
}

function recoverFromStaleServerFn(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(STALE_RELOAD_KEY)) return;
    window.sessionStorage.setItem(STALE_RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — still attempt a single reload below.
  }
  window.location.reload();
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const run = async (headers: Record<string, string>) => {
      try {
        return await next({ headers });
      } catch (error) {
        if (isStaleServerFnError(error)) recoverFromStaleServerFn();
        throw error;
      }
    };

    if (isRecoveryServerLoginAllowed()) {
      return run({});
    }

    let token: string | undefined;
    for (let i = 0; i < 25; i++) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
      if (token) break;
      if (isSessionRecoveryActive()) await waitForSessionRecovery(500);
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!token) {
      // Try one explicit refresh before giving up.
      const { data } = await supabase.auth.refreshSession();
      token = data.session?.access_token;
    }
    return run(token ? { Authorization: `Bearer ${token}` } : {});
  },
);

