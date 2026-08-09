import { parseSelections } from "@/lib/preorder-math";

/**
 * Canonical communication state for one restaurant-order unit
 * (one guest + one cuisine).
 *
 * Rule: EVERY guest who ordered a meal needs the payment update text, unless
 * the restaurant has recorded them as paid. The original-message history is
 * reference only and never gates the queue.
 */
export type MealCommunicationState = "paid" | "needs_update" | "update_sent" | "exception";

export type MealCommunicationRow = {
  id: string;
  invitation_id: string | null;
  name: string;
  phone: string;
  cuisine: string;
  qty: number;
  inviter_id: string | null;
  inviter: string;
  original_sent_at: string | null;
  update_sent_at: string | null;
  paid_at: string | null;
  state: MealCommunicationState;
  exception: string | null;
};

export type MealCommunicationTotals = {
  households: number;
  message_units: number;
  meal_quantity: number;
  paid: number;
  needs_update: number;
  update_sent: number;
  exceptions: number;
  reconciles: boolean;
};

type SourcePreorder = {
  id: string;
  invitation_id: string | null;
  name: string | null;
  phone: string | null;
  selections: unknown;
};

type SourceSend = { preorder_id: string; cuisine: string; sent_at: string };
type SourcePayment = { preorder_id: string; cuisine: string; paid_at: string | null };
type SourceConfirmation = {
  preorder_id: string;
  cuisine: string;
  confirmed: boolean | null;
  confirmed_at: string | null;
};
type SourceInvitation = { id: string; inviter_id: string | null };
type SourceInviter = { id: string; name: string | null };

const keyFor = (preorderId: string, cuisine: string) => `${preorderId}::${cuisine}`;
const normalizeCuisine = (raw: string) => parseSelections([{ cuisine: raw, qty: 1 }])[0]?.cuisine;

export function buildMealCommunicationLedger(input: {
  preorders: SourcePreorder[];
  invitations: SourceInvitation[];
  inviters: SourceInviter[];
  originalSends: SourceSend[];
  updateSends: SourceSend[];
  payments?: SourcePayment[];
  confirmations?: SourceConfirmation[];
}) {
  const inviterByInvitation = new Map(input.invitations.map((row) => [row.id, row.inviter_id]));
  const inviterNameById = new Map(input.inviters.map((row) => [row.id, row.name?.trim() || "Committee"]));
  const originalByKey = new Map<string, string>();
  const updateByKey = new Map<string, string>();
  const paidByKey = new Map<string, string>();

  for (const row of input.originalSends) {
    const cuisine = normalizeCuisine(row.cuisine);
    if (cuisine) originalByKey.set(keyFor(row.preorder_id, cuisine), row.sent_at);
  }
  for (const row of input.updateSends) {
    const cuisine = normalizeCuisine(row.cuisine);
    if (cuisine) updateByKey.set(keyFor(row.preorder_id, cuisine), row.sent_at);
  }
  for (const row of input.payments ?? []) {
    const cuisine = normalizeCuisine(row.cuisine);
    if (cuisine) paidByKey.set(keyFor(row.preorder_id, cuisine), row.paid_at ?? "recorded");
  }
  for (const row of input.confirmations ?? []) {
    if (!row.confirmed) continue;
    const cuisine = normalizeCuisine(row.cuisine);
    if (!cuisine) continue;
    const key = keyFor(row.preorder_id, cuisine);
    if (!paidByKey.has(key)) paidByKey.set(key, row.confirmed_at ?? "recorded");
  }

  const rows: MealCommunicationRow[] = [];
  for (const preorder of input.preorders) {
    const quantities = new Map<string, number>();
    for (const selection of parseSelections(preorder.selections)) {
      quantities.set(selection.cuisine, (quantities.get(selection.cuisine) ?? 0) + selection.qty);
    }

    for (const [cuisine, qty] of quantities) {
      const key = keyFor(preorder.id, cuisine);
      const originalSentAt = originalByKey.get(key) ?? null;
      const updateSentAt = updateByKey.get(key) ?? null;
      const paidAtRaw = paidByKey.get(key) ?? null;
      const paidAt = paidAtRaw === "recorded" ? null : paidAtRaw;
      const isPaid = paidAtRaw !== null;
      const inviterId = preorder.invitation_id
        ? (inviterByInvitation.get(preorder.invitation_id) ?? null)
        : null;

      // Paid wins over everything: a guest who already paid is never chased.
      let exception: string | null = null;
      if (!isPaid) {
        if (!preorder.invitation_id) exception = "Order is not linked to an invitation";
        else if (!preorder.phone?.trim()) exception = "Guest has no phone number";
      }

      const state: MealCommunicationState = isPaid
        ? "paid"
        : exception
          ? "exception"
          : updateSentAt
            ? "update_sent"
            : "needs_update";

      rows.push({
        id: preorder.id,
        invitation_id: preorder.invitation_id,
        name: preorder.name?.trim() || "Guest",
        phone: preorder.phone?.trim() || "",
        cuisine,
        qty,
        inviter_id: inviterId,
        inviter: inviterId
          ? (inviterNameById.get(inviterId) ?? "Committee")
          : "Not linked to a committee member",
        original_sent_at: originalSentAt,
        update_sent_at: updateSentAt,
        paid_at: paidAt,
        state,
        exception,
      });
    }
  }

  rows.sort((a, b) => a.inviter.localeCompare(b.inviter) || a.name.localeCompare(b.name));
  const totals: MealCommunicationTotals = {
    households: new Set(rows.map((row) => row.id)).size,
    message_units: rows.length,
    meal_quantity: rows.reduce((sum, row) => sum + row.qty, 0),
    paid: rows.filter((row) => row.state === "paid").length,
    needs_update: rows.filter((row) => row.state === "needs_update").length,
    update_sent: rows.filter((row) => row.state === "update_sent").length,
    exceptions: rows.filter((row) => row.state === "exception").length,
    reconciles: false,
  };
  totals.reconciles =
    totals.message_units ===
    totals.paid + totals.needs_update + totals.update_sent + totals.exceptions;

  return { rows, totals, generated_at: new Date().toISOString() };
}
