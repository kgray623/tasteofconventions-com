import { useRouterState } from "@tanstack/react-router";
import { useRoles } from "@/hooks/use-roles";

/**
 * Effective admin state for pages under /admin.
 *
 * When an actual admin views a page with `?view=committee` in the URL, they
 * are "previewing as committee": `isAdmin` returns false so admin-only UI
 * hides, while `isActualAdmin` remains true for anything that must know the
 * real role.
 */
export function useAdminView() {
  const roles = useRoles();
  const search = useRouterState({ select: (s) => s.location.search }) as {
    view?: "committee";
  };
  const previewCommittee = roles.isAdmin && search?.view === "committee";
  return {
    ...roles,
    isActualAdmin: roles.isAdmin,
    isAdmin: roles.isAdmin && !previewCommittee,
    previewCommittee,
  };
}
