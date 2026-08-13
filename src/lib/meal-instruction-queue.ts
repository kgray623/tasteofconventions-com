import type { MealTextEvidenceLine, MealTextRow } from "@/lib/meal-text-defaults";

export type MealInstructionQueueOrder = MealTextRow;

export type MealInstructionQueueContact = {
  id: string;
  name: string;
  phone: string;
  inviter: string;
  orders: MealInstructionQueueOrder[];
};

/**
 * Every active preorder cuisine remains in the instruction queue until a
 * retained human review explicitly confirms that exact physical text.
 * Payment state and legacy marks deliberately do not affect this queue.
 */
export function buildMealInstructionQueue(
  rows: MealTextRow[],
  evidence: MealTextEvidenceLine[],
): MealInstructionQueueContact[] {
  const confirmed = new Set(
    evidence
      .filter((line) => line.decision === "confirmed")
      .map((line) => `${line.preorder_id}::${line.cuisine}`),
  );
  const contacts = new Map<string, MealInstructionQueueContact>();

  for (const row of rows) {
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