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

/**
 * Reconstruct the reported physical batch from the chronological marks on the
 * latest activity day. Anything after the reported count stays visible as an
 * exception instead of being silently accepted as physically sent.
 */
export function reconstructReportedTextBatch(
  rows: MealTextRow[],
  events: PaymentUpdateEvent[],
  reportedCount: number,
) {
  const activeIds = new Set(rows.map((row) => row.id));
  const eligible = events
    .filter((event) =>
      event.campaign === "payment_update" &&
      event.action === "sent" &&
      event.evidence_source !== "human_reconciliation" &&
      activeIds.has(event.preorder_id),
    );
  const activityDay = eligible.reduce<string | null>((latest, event) => {
    const day = event.event_at.slice(0, 10);
    return latest === null || day > latest ? day : latest;
  }, null);
  const firstByContact = new Map<string, string>();
  for (const event of eligible) {
    if (event.event_at.slice(0, 10) !== activityDay) continue;
    const current = firstByContact.get(event.preorder_id);
    if (!current || event.event_at < current) firstByContact.set(event.preorder_id, event.event_at);
  }
  const ordered = [...firstByContact.entries()].sort((a, b) =>
    a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]),
  );
  const reconstructedIds = ordered.slice(0, reportedCount).map(([id]) => id);
  const rowById = new Map(rows.map((row) => [row.id, row] as const));
  return {
    activity_day: activityDay,
    reported_count: reportedCount,
    reconstructed_count: reconstructedIds.length,
    reconstructed_contact_ids: reconstructedIds,
    overflow: ordered.slice(reportedCount).map(([id, firstMarkedAt]) => {
      const row = rowById.get(id);
      return {
        id,
        name: row?.name ?? "Unknown meal contact",
        phone: row?.phone ?? "",
        first_marked_at: firstMarkedAt,
      };
    }),
  };
}

/**
 * Every active preorder cuisine remains in the instruction queue until a
 * retained human review explicitly confirms that exact physical text.
 * Payment state and legacy marks deliberately do not affect this queue.
 */
export function buildMealInstructionQueue(
  rows: MealTextRow[],
  evidence: MealTextEvidenceLine[],
  reconstructedSentContactIds: string[] = [],
): MealInstructionQueueContact[] {
  const confirmed = new Set(
    evidence
      .filter((line) => line.decision === "confirmed")
      .map((line) => `${line.preorder_id}::${line.cuisine}`),
  );
  const reconstructedSent = new Set(reconstructedSentContactIds);
  const contacts = new Map<string, MealInstructionQueueContact>();

  for (const row of rows) {
    if (reconstructedSent.has(row.id)) continue;
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