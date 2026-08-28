import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBurmeseRecheckList, type BurmeseRecheckResult } from "@/lib/burmese-recheck.functions";
import { useRoles } from "@/hooks/use-roles";

/** Burmese payment-proof recheck roster, shared through the Query cache. */
export function useBurmeseRecheck() {
  const { isTeam, isAdmin, loading: rolesLoading } = useRoles();
  const load = useServerFn(getBurmeseRecheckList);
  const query = useQuery({
    queryKey: ["burmese-recheck-list"],
    queryFn: async () => (await load()) as BurmeseRecheckResult,
    enabled: !rolesLoading && (isTeam || isAdmin),
    staleTime: 0,
    retry: 1,
  });

  const data = query.data ?? null;
  return {
    loading: rolesLoading || query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    groups: data?.groups ?? [],
    totals: data?.totals ?? { guests: 0, members: 0, sent: 0, toSend: 0 },
    template: data?.template ?? "",
    isAdmin: data?.isAdmin ?? isAdmin,
    generatedAt: data?.generated_at ?? null,
    refetch: query.refetch,
  };
}
