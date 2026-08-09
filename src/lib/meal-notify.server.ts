import { loadMealCommunicationLedger } from "@/lib/meal-communication.server";

export type MealNotifyInviter = {
  inviter_id: string | null;
  name: string;
  received_nothing: number;
  needs_update: number;
  current: number;
  exceptions: number;
};

export async function loadMealNotifyRollup(supabaseAdmin: any) {
  const ledger = await loadMealCommunicationLedger(supabaseAdmin);
  const byInviter = new Map<string, MealNotifyInviter>();
  for (const row of ledger.rows) {
    const key = row.inviter_id ?? "__unlinked__";
    const bucket = byInviter.get(key) ?? {
      inviter_id: row.inviter_id,
      name: row.inviter,
      received_nothing: 0,
      needs_update: 0,
      current: 0,
      exceptions: 0,
    };
    const bucketKey = row.state === "exception" ? "exceptions" : row.state;
    bucket[bucketKey] += 1;
    byInviter.set(key, bucket);
  }
  return {
    ...ledger,
    inviters: [...byInviter.values()].sort(
      (a, b) =>
        b.needs_update - a.needs_update ||
        b.received_nothing - a.received_nothing ||
        a.name.localeCompare(b.name),
    ),
  };
}