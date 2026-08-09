import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type { CanonicalCommitteeMember } from "@/lib/committee-roster.server";

export const getCanonicalCommitteeRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadCanonicalCommitteeRoster } = await import("@/lib/committee-roster.server");
    return loadCanonicalCommitteeRoster(context.supabase, context.userId);
  });