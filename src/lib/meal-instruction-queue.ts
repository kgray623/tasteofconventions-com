import type { MealTextEvidenceLine, MealTextRow } from "@/lib/meal-text-defaults";

export type MealInstructionQueueOrder = MealTextRow;

export type MealInstructionQueueContact = {
  id: string;
  name: string;
  phone: string;
  inviter: string;
  orders: MealInstructionQueueOrder[];
};

export type PaymentUpdateEvent = {
  preorder_id: string;
  event_at: string;
  action: string;
  campaign: string;
  evidence_source?: string | null;
};

/** The communication batch Kari explicitly marked after texting on August 12. */
export const MEAL_INSTRUCTION_BATCH_DAY = "2026-08-12";

/**
 * Count every active preorder contact with an explicit sent mark on the
 * selected communication day. There is no inferred count, chronological cap,
 * payment filter, or inviter/role filter.
 */
export function reconcileExplicitTextBatch(
  rows: MealTextRow[],
  events: PaymentUpdateEvent[],
  activityDay = MEAL_INSTRUCTION_BATCH_DAY,
) {
  const activeIds = new Set(rows.map((row) => row.id));
  const firstByContact = new Map<string, string>();
  for (const event of events) {
    if (event.campaign !== "payment_update" || event.action !== "sent") continue;
    if (event.evidence_source === "human_reconciliation") continue;
    if (!activeIds.has(event.preorder_id)) continue;
    if (event.event_at.slice(0, 10) !== activityDay) continue;
    const current = firstByContact.get(event.preorder_id);
    if (!current || event.event_at < current) firstByContact.set(event.preorder_id, event.event_at);
  }
  const ordered = [...firstByContact.entries()].sort((a, b) =>
    a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]),
  );
  const markedIds = ordered.map(([id]) => id);
  return {
    activity_day: activityDay,
    reported_count: markedIds.length,
    reconstructed_count: markedIds.length,
    reconstructed_contact_ids: markedIds,
    overflow: [],
  };
}

/**
 * Every active preorder contact remains until either the selected day's
 * explicit person-level sent mark exists or retained human confirmation
 * covers every currently active cuisine.
 */
export function buildMealInstructionQueue(
  rows: MealTextRow[],
  evidence: MealTextEvidenceLine[],
  explicitlySentContactIds: string[] = [],
): MealInstructionQueueContact[] {
  const confirmed = new Set(
    evidence
      .filter((line) => line.decision === "confirmed")
      .map((line) => `${line.preorder_id}::${line.cuisine}`),
  );
  const explicitlySent = new Set(explicitlySentContactIds);
  const contacts = new Map<string, MealInstructionQueueContact>();

  for (const row of rows) {
    if (explicitlySent.has(row.id)) continue;
    if (confirmed.has(`${row.id}::${row.cuisine}`)) continue;
    const contact = contacts.get(row.id) ?? {
      id: row.id,
      name: row.name,
      phone: row.phone,
      inviter: row.inviter,
      orders: [],
    };
    contact.orders.push(row);
    contacts.set(row.id, contact);
  }

  return [...contacts.values()]
    .map((contact) => ({
      ...contact,
      orders: contact.orders.sort((a, b) => a.cuisine.localeCompare(b.cuisine)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}