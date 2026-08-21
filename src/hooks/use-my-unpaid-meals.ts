import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyMealTexts,
  type CommitteeMealTextRow,
} from "@/lib/committee-meal-texts.functions";
import { isPaidState } from "@/lib/meal-communication";
import { phoneTail } from "@/lib/phone";

/**
 * Read-only view of "my guests who still owe for their meal".
 *
 * No new calculation: it reuses the same server ledger (`getMyMealTexts`) and
 * the same canonical `isPaidState` used by the admin meal-payment screens.
 * The ledger already drops guests who RSVP'd "no" or are Zoom-only, so those
 * exclusions stay consistent with the rest of the app.
 */
export function useMyUnpaidMeals() {
  const load = useServerFn(getMyMealTexts);
  const [rows, setRows] = useState<CommitteeMealTextRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await load({ data: {} });
        if (alive) setRows(res.rows);
      } catch (e) {
        if (alive) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Could not load unpaid guests");
        }
      }
    })();
    return () => {
      alive = false;
    };
    // Load once per mount; the wrapped server fn identity changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => {
    const unpaid = (rows ?? []).filter((row) => !isPaidState(row.state));
    const tails = new Set<string>();
    for (const row of unpaid) {
      const tail = phoneTail(row.phone);
      if (tail.length >= 7) tails.add(tail);
    }
    return {
      loading: rows === null,
      error,
      unpaidRows: unpaid,
      /** Distinct guests (households) with at least one unpaid meal. */
      count: new Set(unpaid.map((row) => row.id)).size,
      orderLines: unpaid.length,
      plates: unpaid.reduce((sum, row) => sum + row.qty, 0),
      unpaidPhoneTails: tails,
    };
  }, [rows, error]);
}
