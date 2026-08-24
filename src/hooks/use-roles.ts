import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { withTimeout } from "@/lib/async-safety";
import { ensureMyTeamRole } from "@/lib/account.functions";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const ensureRoles = useServerFn(ensureMyTeamRole);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async (active: () => boolean = () => true) => {
    if (!user) {
      if (active()) { setRoles([]); setLoading(false); }
      return;
    }
    setLoading(true);
    try {
      await withTimeout(ensureRoles(), 5000).catch(() => null);
      // Read roles through a SECURITY DEFINER RPC. Reading user_roles directly
      // fails with "permission denied for table user_roles" whenever the browser
      // session has silently expired; the RPC returns an empty list instead.
      const { data } = await withTimeout(supabase.rpc("get_my_roles"), 3000);
      if (active()) setRoles((data ?? []).map((r) => r.role as string));
    } catch {
      if (active()) setRoles([]);
    } finally {
      if (active()) setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    let alive = true;
    const active = () => alive;
    refresh(active);
    return () => {
      alive = false;
    };
  }, [user?.id, authLoading]);

  return {
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isTeam: roles.includes("team") || roles.includes("admin"),
    refresh,
  };
}
