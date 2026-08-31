import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAlbumTextList, type AlbumTextResult } from "@/lib/album-texts.functions";
import { useRoles } from "@/hooks/use-roles";

/**
 * Everyone who attended (in person or Zoom) with their album-announcement text
 * status. Shared through the Query cache so the nav badge and the page can never
 * show different numbers.
 */
export function useAlbumTexts() {
  const { isTeam, isAdmin, loading: rolesLoading } = useRoles();
  const load = useServerFn(getAlbumTextList);
  const query = useQuery({
    queryKey: ["album-text-list"],
    queryFn: async () => (await load()) as AlbumTextResult,
    enabled: !rolesLoading && (isTeam || isAdmin),
    staleTime: 60_000,
    retry: 1,
  });

  const data = query.data ?? null;
  return {
    loading: rolesLoading || query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    groups: data?.groups ?? [],
    totals:
      data?.totals ?? {
        guests: 0,
        members: 0,
        sent: 0,
        toSend: 0,
        noPhone: 0,
        inPerson: 0,
        zoom: 0,
      },
    template: data?.template ?? "",
    isAdmin: data?.isAdmin ?? isAdmin,
    generatedAt: data?.generated_at ?? null,
    refetch: query.refetch,
  };
}
