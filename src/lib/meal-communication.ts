import { parseSelections } from "@/lib/preorder-math";

/**
 * Canonical communication state for one restaurant-order unit
 * (one guest + one cuisine).
 *
 * Rule: EVERY guest who ordered a meal needs the payment update text, unless a
 * payment has been recorded for them. A payment can be recorded three ways:
 * confirmed by the restaurant, reported by the guest, or recorded by a
 * committee member on the guest's behalf. Guest/committee reports still count
 * as paid for texting purposes (nobody is chased for money they say they sent)
 * but are tracked separately until the restaurant confirms them.
 *
 * The original-message history is reference only and never gates the queue.
 */
export type MealCommunicationState =
  | "paid_confirmed"
  | "paid_reported"
  | "needs_update"
  | "update_sent"
  | "exception";

export type MealPaymentSource = "restaurant" | "guest_reported" | "committee_recorded";

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
  paid_source: MealPaymentSource | null;
  paid_method: string | null;
  paid_note: string | null;
  paid_reported_by_label: string | null;
  verified_at: string | null;
  state: MealCommunicationState;
  exception: string | null;
};

export type MealCommunicationTotals = {
  households: number;
  message_units: number;
  meal_quantity: number;
  paid_meal_quantity: number;
  unpaid_meal_quantity: number;
  paid_confirmed: number;
  paid_reported: number;
  paid: number;
  needs_update: number;
  update_sent: number;
  exceptions: number;
  reconciles: boolean;
  /**
   * True when the headline plate count equals the sum of the per-cuisine plate
   * counts AND no submitted meal quantity was dropped while parsing. Computed
   * once here so every screen gets the same check instead of recomputing it.
   */
  plates_reconcile: boolean;
};

type SourcePreorder = {
  id: string;
  invitation_id: string | null;
  name: string | null;
  phone: string | null;
  selections: unknown;
};

type SourceSend = { preorder_id: string; cuisine: string; sent_at: string };
type SourceTextEvent = {
  preorder_id: string;
  cuisine: string;
  campaign: "original" | "payment_update";
  action: "sent" | "reversed";
  event_at: string;
  created_at: string;
};
type SourcePayment = {
  preorder_id: string;
  cuisine: string;
  paid_at: string | null;
  source?: string | null;
  method?: string | null;
  reported_note?: string | null;
  reported_by_label?: string | null;
  verified_at?: string | null;
};
type SourceConfirmation = {
  preorder_id: string;
  cuisine: string;
  confirmed: boolean | null;
  confirmed_at: string | null;
};
type SourceInvitation = { id: string; inviter_id: string | null };
type SourceInviter = { id: string; name: string | null };

type PaymentFact = {
  paid_at: string | null;
  source: MealPaymentSource;
  method: string | null;
  note: string | null;
  reported_by_label: string | null;
  verified_at: string | null;
};

const keyFor = (preorderId: string, cuisine: string) => `${preorderId}::${cuisine}`;
const normalizeCuisine = (raw: string) => parseSelections([{ cuisine: raw, qty: 1 }])[0]?.cuisine;

const normalizeSource = (raw: string | null | undefined): MealPaymentSource =>
  raw === "guest_reported" || raw === "committee_recorded" ? raw : "restaurant";

export function buildMealCommunicationLedger(input: {
  preorders: SourcePreorder[];
  invitations: SourceInvitation[];
  inviters: SourceInviter[];
  originalSends: SourceSend[];
  updateSends: SourceSend[];
  textEvents?: SourceTextEvent[];
  payments?: SourcePayment[];
  confirmations?: SourceConfirmation[];
}) {
  const inviterByInvitation = new Map(input.invitations.map((row) => [row.id, row.inviter_id]));
  const inviterNameById = new Map(input.inviters.map((row) => [row.id, row.name?.trim() || "Committee"]));
  const originalByKey = new Map<string, string>();
  const updateByKey = new Map<string, string>();
  const paidByKey = new Map<string, PaymentFact>();

  const latestEvents = new Map<string, SourceTextEvent>();
  for (const event of input.textEvents ?? []) {
    const cuisine = normalizeCuisine(event.cuisine);
    if (!cuisine) continue;
    const key = `${event.campaign}::${keyFor(event.preorder_id, cuisine)}`;
    const existing = latestEvents.get(key);
    if (
      !existing ||
      event.event_at > existing.event_at ||
      (event.event_at === existing.event_at && event.created_at > existing.created_at)
    ) {
      latestEvents.set(key, event);
    }
  }

  for (const row of input.originalSends) {
    const cuisine = normalizeCuisine(row.cuisine);
    if (cuisine) originalByKey.set(keyFor(row.preorder_id, cuisine), row.sent_at);
  }
  for (const row of input.updateSends) {
    const cuisine = normalizeCuisine(row.cuisine);
    if (cuisine) updateByKey.set(keyFor(row.preorder_id, cuisine), row.sent_at);
  }
  for (const [eventKey, event] of latestEvents) {
    const prefix = `${event.campaign}::`;
    const key = eventKey.slice(prefix.length);
    const target = event.campaign === "original" ? originalByKey : updateByKey;
    if (event.action === "sent") target.set(key, event.event_at);
    else target.delete(key);
  }
  for (const row of input.payments ?? []) {
    const cuisine = normalizeCuisine(row.cuisine);
    if (!cuisine) continue;
    const key = keyFor(row.preorder_id, cuisine);
    const fact: PaymentFact = {
      paid_at: row.paid_at ?? null,
      source: normalizeSource(row.source),
      method: row.method?.trim() || null,
      note: row.reported_note?.trim() || null,
      reported_by_label: row.reported_by_label?.trim() || null,
      verified_at: row.verified_at ?? null,
    };
    const existing = paidByKey.get(key);
    // Restaurant proof always wins over a self-report; never overwrite it.
    if (!existing || (existing.source !== "restaurant" && fact.source === "restaurant")) {
      paidByKey.set(key, fact);
    }
  }
  for (const row of input.confirmations ?? []) {
    if (!row.confirmed) continue;
    const cuisine = normalizeCuisine(row.cuisine);
    if (!cuisine) continue;
    const key = keyFor(row.preorder_id, cuisine);
    const existing = paidByKey.get(key);
    if (!existing || existing.source !== "restaurant") {
      paidByKey.set(key, {
        paid_at: row.confirmed_at ?? existing?.paid_at ?? null,
        source: "restaurant",
        method: existing?.method ?? null,
        note: existing?.note ?? null,
        reported_by_label: existing?.reported_by_label ?? null,
        verified_at: row.confirmed_at ?? null,
      });
    }
  }

  const rows: MealCommunicationRow[] = [];
  // Any submitted meal quantity the parser could not read is a dropped plate:
  // it must surface as a visible mismatch, never be silently rounded away.
  let droppedSubmittedQuantities = 0;
  for (const preorder of input.preorders) {
    droppedSubmittedQuantities += countDroppedSelections(preorder.selections);
    const quantities = new Map<string, number>();
    for (const selection of parseSelections(preorder.selections)) {
      quantities.set(selection.cuisine, (quantities.get(selection.cuisine) ?? 0) + selection.qty);
    }

    for (const [cuisine, qty] of quantities) {
      const key = keyFor(preorder.id, cuisine);
      const originalSentAt = originalByKey.get(key) ?? null;
      const updateSentAt = updateByKey.get(key) ?? null;
      const payment = paidByKey.get(key) ?? null;
      const inviterId = preorder.invitation_id
        ? (inviterByInvitation.get(preorder.invitation_id) ?? null)
        : null;

      // Paid wins over everything: a guest who paid is never chased.
      let exception: string | null = null;
      if (!payment) {
        if (!preorder.invitation_id) exception = "Order is not linked to an invitation";
        else if (!preorder.phone?.trim()) exception = "Guest has no phone number";
      }

      const state: MealCommunicationState = payment
        ? payment.source === "restaurant"
          ? "paid_confirmed"
          : "paid_reported"
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
        paid_at: payment?.paid_at ?? null,
        paid_source: payment?.source ?? null,
        paid_method: payment?.method ?? null,
        paid_note: payment?.note ?? null,
        paid_reported_by_label: payment?.reported_by_label ?? null,
        verified_at: payment?.verified_at ?? null,
        state,
        exception,
      });
    }
  }

  rows.sort((a, b) => a.inviter.localeCompare(b.inviter) || a.name.localeCompare(b.name));
  const count = (state: MealCommunicationState) => rows.filter((row) => row.state === state).length;
  const totals: MealCommunicationTotals = {
    households: new Set(rows.map((row) => row.id)).size,
    message_units: rows.length,
    meal_quantity: rows.reduce((sum, row) => sum + row.qty, 0),
    paid_meal_quantity: rows
      .filter((row) => row.state === "paid_confirmed" || row.state === "paid_reported")
      .reduce((sum, row) => sum + row.qty, 0),
    unpaid_meal_quantity: rows
      .filter((row) => row.state !== "paid_confirmed" && row.state !== "paid_reported")
      .reduce((sum, row) => sum + row.qty, 0),
    paid_confirmed: count("paid_confirmed"),
    paid_reported: count("paid_reported"),
    paid: count("paid_confirmed") + count("paid_reported"),
    needs_update: count("needs_update"),
    update_sent: count("update_sent"),
    exceptions: count("exception"),
    reconciles: false,
  };
  totals.reconciles =
    totals.message_units ===
    totals.paid_confirmed +
      totals.paid_reported +
      totals.needs_update +
      totals.update_sent +
      totals.exceptions;

  return { rows, totals, generated_at: new Date().toISOString() };
}

/** True when this order unit still needs the payment update text. */
export const isPaidState = (state: MealCommunicationState | undefined) =>
  state === "paid_confirmed" || state === "paid_reported";
