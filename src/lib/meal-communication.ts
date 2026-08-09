import { parseSelections } from "@/lib/preorder-math";

export type MealCommunicationState =
  | "received_nothing"
  | "needs_update"
  | "current"
  | "exception";

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
  state: MealCommunicationState;
  exception: string | null;
};

export type MealCommunicationTotals = {
  households: number;
  message_units: number;
  meal_quantity: number;
  received_nothing: number;
  needs_update: number;
  current: number;
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
type SourceInvitation = { id: string; inviter_id: string | null };
type SourceInviter = { id: string; name: string | null };

const keyFor = (preorderId: string, cuisine: string) => `${preorderId}::${cuisine}`;

export function buildMealCommunicationLedger(input: {
  preorders: SourcePreorder[];
  invitations: SourceInvitation[];
  inviters: SourceInviter[];
  originalSends: SourceSend[];
  updateSends: SourceSend[];
}) {
  const inviterByInvitation = new Map(input.invitations.map((row) => [row.id, row.inviter_id]));
  const inviterNameById = new Map(input.inviters.map((row) => [row.id, row.name?.trim() || "Committee"]));
  const originalByKey = new Map<string, string>();
  const updateByKey = new Map<string, string>();

  for (const row of input.originalSends) {
    const cuisine = parseSelections([{ cuisine: row.cuisine, qty: 1 }])[0]?.cuisine;
    if (cuisine) originalByKey.set(keyFor(row.preorder_id, cuisine), row.sent_at);
  }
  for (const row of input.updateSends) {
    const cuisine = parseSelections([{ cuisine: row.cuisine, qty: 1 }])[0]?.cuisine;
    if (cuisine) updateByKey.set(keyFor(row.preorder_id, cuisine), row.sent_at);
  }

  const rows: MealCommunicationRow[] = [];
  for (const preorder of input.preorders) {
    const quantities = new Map<string, number>();
    for (const selection of parseSelections(preorder.selections)) {
      quantities.set(selection.cuisine, (quantities.get(selection.cuisine) ?? 0) + selection.qty);
    }

    for (const [cuisine, qty] of quantities) {
      const originalSentAt = originalByKey.get(keyFor(preorder.id, cuisine)) ?? null;
      const updateSentAt = updateByKey.get(keyFor(preorder.id, cuisine)) ?? null;
      const inviterId = preorder.invitation_id
        ? (inviterByInvitation.get(preorder.invitation_id) ?? null)
        : null;
      let exception: string | null = null;
      if (!preorder.invitation_id) exception = "Order is not linked to an invitation";
      else if (!preorder.phone?.trim()) exception = "Guest has no phone number";
      else if (updateSentAt && !originalSentAt) exception = "Update recorded without an original message";

      const state: MealCommunicationState = exception
        ? "exception"
        : updateSentAt
          ? "current"
          : originalSentAt
            ? "needs_update"
            : "received_nothing";

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
    received_nothing: rows.filter((row) => row.state === "received_nothing").length,
    needs_update: rows.filter((row) => row.state === "needs_update").length,
    current: rows.filter((row) => row.state === "current").length,
    exceptions: rows.filter((row) => row.state === "exception").length,
    reconciles: false,
  };
  totals.reconciles =
    totals.message_units ===
    totals.received_nothing + totals.needs_update + totals.current + totals.exceptions;

  return { rows, totals, generated_at: new Date().toISOString() };
}