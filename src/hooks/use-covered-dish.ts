import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCoveredDishList, type CoveredDishResult } from "@/lib/covered-dish.functions";
import { useRoles } from "@/hooks/use-roles";

/**
 * Committee-wide list of guests attending in person with no catered meal order.
 * Read-only; shared through the Query cache so the nav badge and the page can
 * never show different numbers.
 */
export function useCoveredDish() {
  const { isTeam, isAdmin, loading: rolesLoading } = useRoles();
  const load = useServerFn(getCoveredDishList);
  const query = useQuery({
    queryKey: ["covered-dish-list"],
    queryFn: async () => (await load()) as CoveredDishResult,
    enabled: !rolesLoading && (isTeam || isAdmin),
    staleTime: 60_000,
    retry: 1,
  });

  const data = query.data ?? null;
  return {
    loading: rolesLoading || query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    groups: data?.groups ?? [],
    totals: data?.totals ?? { guests: 0, seats: 0, members: 0, sent: 0, toSend: 0 },
    template: data?.template ?? "",
    isAdmin: data?.isAdmin ?? isAdmin,
    generatedAt: data?.generated_at ?? null,
    refetch: query.refetch,
  };
}
