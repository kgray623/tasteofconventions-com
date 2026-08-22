import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyMealTexts,
  type CommitteeMealTextRow,
} from "@/lib/committee-meal-texts.functions";
import { isPaidState } from "@/lib/meal-communication";
import { phoneTail } from "@/lib/phone";

const normName = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Read-only view of "my guests who still owe for their meal".
 *
 * No new calculation: it reuses the same server ledger (`getMyMealTexts`) and
 * the same canonical `isPaidState` used by the admin meal-payment screens.
 * The ledger already drops guests who RSVP'd "no" or are Zoom-only, so those
 * exclusions stay consistent with the rest of the app.
 *
 * Shared through the TanStack Query cache so the nav badge and the filtered
 * guest list always read the exact same ledger result.
 */
export function useMyUnpaidMeals() {
  const load = useServerFn(getMyMealTexts);
  const query = useQuery({
    queryKey: ["my-unpaid-meals"],
    queryFn: async () => (await load({ data: {} })).rows as CommitteeMealTextRow[],
    staleTime: 60_000,
    retry: 1,
  });

  const rows = query.data ?? null;
  const error = query.error instanceof Error ? query.error.message : null;

  return useMemo(() => {
    const unpaid = (rows ?? []).filter((row) => !isPaidState(row.state));
    const tails = new Set<string>();
    const invitationIds = new Set<string>();
    const names = new Set<string>();
    for (const row of unpaid) {
      const tail = phoneTail(row.phone);
      if (tail.length >= 7) tails.add(tail);
      if (row.invitationId) invitationIds.add(row.invitationId);
      for (const candidate of [row.guestName, row.name]) {
        const n = normName(candidate);
        if (n.length >= 4) names.add(n);
      }
    }
    return {
      loading: query.isPending,
      error,
      unpaidRows: unpaid,
      /** Distinct guests (households) with at least one unpaid meal. */
      count: new Set(unpaid.map((row) => row.id)).size,
      orderLines: unpaid.length,
      plates: unpaid.reduce((sum, row) => sum + row.qty, 0),
      unpaidPhoneTails: tails,
      unpaidInvitationIds: invitationIds,
      unpaidNames: names,
    };
  }, [rows, error, query.isPending]);
}

export const normalizeUnpaidName = normName;
