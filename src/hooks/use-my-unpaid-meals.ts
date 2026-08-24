import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyMealTexts,
  type CommitteeMealTextRow,
} from "@/lib/committee-meal-texts.functions";
import {
  listMealFollowUpNotes,
  saveMealFollowUpNote,
  type MealFollowUpNote,
} from "@/lib/meal-follow-up-notes.functions";
import { isPaidState } from "@/lib/meal-communication";
import { phoneTail } from "@/lib/phone";
import { useRoles } from "@/hooks/use-roles";

const normName = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z]/g, "");

export type UnpaidGroup = {
  inviterId: string | null;
  inviterName: string;
  rows: CommitteeMealTextRow[];
  guests: number;
  plates: number;
};

/**
 * Read-only view of guests who still owe for their meal.
 *
 * No new calculation: it reuses the same server ledger (`getMyMealTexts`) and
 * the same canonical `isPaidState` used by the admin meal-payment screens.
 * The ledger already drops guests who RSVP'd "no" or are Zoom-only, so those
 * exclusions stay consistent with the rest of the app.
 *
 * Scope: admins get every committee member's guests ("all"); committee members
 * keep their own list ("mine"). Shared through the TanStack Query cache so the
 * nav badge and the filtered guest list always read the same ledger result.
 */
export function useMyUnpaidMeals() {
  const { isTeam, isAdmin, loading: rolesLoading } = useRoles();
  const load = useServerFn(getMyMealTexts);
  const loadNotes = useServerFn(listMealFollowUpNotes);
  // Admins and committee members all read the same committee-wide ledger so the
  // shared "Unpaid guests" page and its badge can never disagree.
  const scope: "mine" | "all" = isTeam || isAdmin ? "all" : "mine";
  const query = useQuery({
    queryKey: ["my-unpaid-meals", scope],
    queryFn: async () => await load({ data: { scope } }),
    enabled: !rolesLoading,
    staleTime: 60_000,
    retry: 1,
  });
  const notesQuery = useQuery({
    queryKey: ["meal-follow-up-notes"],
    queryFn: async () => await loadNotes({ data: {} }),
    enabled: !rolesLoading && (isTeam || isAdmin),
    staleTime: 60_000,
    retry: 1,
  });

  const rows = (query.data?.rows ?? null) as CommitteeMealTextRow[] | null;
  const restaurants = query.data?.restaurants ?? null;
  const error = query.error instanceof Error ? query.error.message : null;

  return useMemo(() => {
    const unpaid = (rows ?? []).filter((row) => !isPaidState(row.state));
    const tails = new Set<string>();
    const invitationIds = new Set<string>();
    const names = new Set<string>();
    const inviterByInvitationId = new Map<string, string>();
    const inviterByPhoneTail = new Map<string, string>();
    const inviterByName = new Map<string, string>();
    for (const row of unpaid) {
      const tail = phoneTail(row.phone);
      const label = row.inviterName || "No committee member recorded";
      if (tail.length >= 7) {
        tails.add(tail);
        if (!inviterByPhoneTail.has(tail)) inviterByPhoneTail.set(tail, label);
      }
      if (row.invitationId) {
        invitationIds.add(row.invitationId);
        if (!inviterByInvitationId.has(row.invitationId))
          inviterByInvitationId.set(row.invitationId, label);
      }
      for (const candidate of [row.guestName, row.name]) {
        const n = normName(candidate);
        if (n.length >= 4) {
          names.add(n);
          if (!inviterByName.has(n)) inviterByName.set(n, label);
        }
      }
    }

    const groupMap = new Map<string, UnpaidGroup>();
    for (const row of unpaid) {
      const key = row.inviterId ?? "__none__";
      const group =
        groupMap.get(key) ??
        {
          inviterId: row.inviterId ?? null,
          inviterName: row.inviterName || "No committee member recorded",
          rows: [],
          guests: 0,
          plates: 0,
        };
      group.rows.push(row);
      group.plates += row.qty;
      groupMap.set(key, group);
    }
    const groups = Array.from(groupMap.values())
      .map((g) => ({ ...g, guests: new Set(g.rows.map((r) => r.id)).size }))
      .sort((a, b) => a.inviterName.localeCompare(b.inviterName, undefined, { sensitivity: "base" }));

    return {
      scope,
      isAdminScope: scope === "all",
      restaurants,
      loading: rolesLoading || query.isPending,
      error,
      unpaidRows: unpaid,
      /** Distinct guests (households) with at least one unpaid meal. */
      count: new Set(unpaid.map((row) => row.id)).size,
      orderLines: unpaid.length,
      plates: unpaid.reduce((sum, row) => sum + row.qty, 0),
      unpaidPhoneTails: tails,
      unpaidInvitationIds: invitationIds,
      unpaidNames: names,
      groups,
      inviterByInvitationId,
      inviterByPhoneTail,
      inviterByName,
    };
  }, [rows, restaurants, error, query.isPending, rolesLoading, scope]);
}

export const normalizeUnpaidName = normName;
