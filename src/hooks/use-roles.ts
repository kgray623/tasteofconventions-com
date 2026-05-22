import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { withTimeout } from "@/lib/async-safety";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async (active: () => boolean = () => true) => {
    if (!user) {
      if (active()) { setRoles([]); setLoading(false); }
      return;
    }
    setLoading(true);
    try {
      const { data } = await withTimeout(
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        3000,
      );
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
