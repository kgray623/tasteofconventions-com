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
const STALE_RELOAD_WINDOW_MS = 15_000;

// Stale IDs surface two ways: an explicit "Invalid server function ID", or a
// 500 from the framework handler dereferencing the missing action
// ("Cannot read properties of undefined (reading 'method')").
const STALE_PATTERNS = [
  "invalid server function id",
  "reading 'method'",
  'reading "method"',
  "of undefined (reading 'method')",
];

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
  const lower = message.toLowerCase();
  return STALE_PATTERNS.some((p) => lower.includes(p));
}


function recoverFromStaleServerFn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const previous = Number(window.sessionStorage.getItem(STALE_RELOAD_KEY) ?? 0);
    if (Date.now() - previous < STALE_RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(STALE_RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — still attempt a single reload below.
  }
  window.location.reload();
  return true;
}

// A signed-out guest (e.g. opening /rsvp/<token>) has no session and never
// will during this call. Waiting 25 * 200ms + a refreshSession() round trip
// made public pages appear to hang on "Loading…". Only wait when there is
// actually a stored Supabase session to hydrate, or a recovery in flight.
function hasStoredSupabaseSession(): boolean {
  if (typeof window === "undefined") return false;
  const looksLikeAuthKey = (key: string | null) =>
    !!key && key.startsWith("sb-") && key.includes("auth-token");
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      if (looksLikeAuthKey(window.localStorage.key(i))) return true;
    }
  } catch {
    // ignore
  }
  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      if (looksLikeAuthKey(window.sessionStorage.key(i))) return true;
    }
  } catch {
    // ignore
  }
  return typeof document !== "undefined" && /sb-[^=]*auth-token/.test(document.cookie ?? "");
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const run = async (headers: Record<string, string>) => {
      try {
        return await next({ headers });
      } catch (error) {
        if (isStaleServerFnError(error) && recoverFromStaleServerFn()) {
          // Keep the rejected request from reaching a route error boundary
          // during the brief interval before the browser unloads this bundle.
          return await new Promise<never>(() => undefined);
        }
        throw error;
      }
    };

    if (isRecoveryServerLoginAllowed()) {
      return run({});
    }

    const { data: initial } = await supabase.auth.getSession();
    let token = initial.session?.access_token;

    if (!token && (hasStoredSupabaseSession() || isSessionRecoveryActive())) {
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
    }

    return run(token ? { Authorization: `Bearer ${token}` } : {});
  },
);


