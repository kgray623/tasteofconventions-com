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
  qty_paid: number;
  inviter_id: string | null;
  inviter: string;
  original_sent_at: string | null;
  update_sent_at: string | null;
  payment_id: string | null;
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

type SourceSend = {
  preorder_id: string;
  cuisine: string;
  sent_at: string;
  marked_by?: string | null;
};
type SourceTextEvent = {
  preorder_id: string;
  cuisine: string;
  campaign: "original" | "payment_update";
  action: "sent" | "reversed";
  event_at: string;
  created_at?: string;
  actor_id?: string | null;
};

type SourcePayment = {
  id?: string | null;
  preorder_id: string;
  cuisine: string;
  qty_paid?: number | string | null;
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
  id: string | null;
  qty_paid: number;
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

export const mealSentMarkKey = (preorderId: string, cuisine: string) => {
  const normalized = normalizeCuisine(cuisine);
  return normalized ? keyFor(preorderId, normalized) : null;
};

export type MealSentMarks = {
  /** preorder_id::normalized cuisine -> sent_at for the original meal message. */
  original: Map<string, string>;
  /** preorder_id::normalized cuisine -> sent_at for the payment-instructions message. */
  update: Map<string, string>;
  /** preorder_id::normalized cuisine -> actor_id who recorded the current payment-update mark. */
  updateActorId: Map<string, string | null>;
};

/**
 * SINGLE SOURCE OF TRUTH for "was this text marked sent?".
 *
 * `meal_text_events` is canonical: it is append-only, immutable, carries the
 * actor and the evidence source, and holds every mark. `meal_text_sends` is
 * dead and is never read. `meal_zelle_text_sends` remains as read-only legacy
 * history for a payment-update key that has no event at all — an event always
 * wins when the two disagree.
 *
 * Every cuisine string is normalized here, once, so a row stored as "Burmese"
 * can never miss a row keyed as "Myanmar" and render as NOT SENT.
 */
export function resolveMealSentMarks(input: {
  updateSends?: SourceSend[];
  textEvents?: SourceTextEvent[];
}): MealSentMarks {
  const original = new Map<string, string>();
  const update = new Map<string, string>();
  const updateActorId = new Map<string, string | null>();

  const latestEvents = new Map<string, SourceTextEvent>();
  for (const event of input.textEvents ?? []) {
    const key = mealSentMarkKey(event.preorder_id, event.cuisine);
    if (!key) continue;
    const eventKey = `${event.campaign}::${key}`;
    const existing = latestEvents.get(eventKey);
    if (
      !existing ||
      event.event_at > existing.event_at ||
      (event.event_at === existing.event_at && (event.created_at ?? "") > (existing.created_at ?? ""))
    ) {
      latestEvents.set(eventKey, event);
    }
  }

  for (const row of input.updateSends ?? []) {
    const key = mealSentMarkKey(row.preorder_id, row.cuisine);
    if (key) {
      update.set(key, row.sent_at);
      if (row.marked_by !== undefined) updateActorId.set(key, row.marked_by ?? null);
    }
  }
  for (const [eventKey, event] of latestEvents) {
    const key = eventKey.slice(`${event.campaign}::`.length);
    const target = event.campaign === "original" ? original : update;
    if (event.action === "sent") target.set(key, event.event_at);
    else target.delete(key);
    if (event.campaign === "payment_update") {
      if (event.action === "sent") updateActorId.set(key, event.actor_id ?? null);
      else updateActorId.delete(key);
    }
  }

  return { original, update, updateActorId };
}

export function buildMealCommunicationLedger(input: {
  preorders: SourcePreorder[];
  invitations: SourceInvitation[];
  inviters: SourceInviter[];
  
  updateSends: SourceSend[];
  textEvents?: SourceTextEvent[];
  payments?: SourcePayment[];
  confirmations?: SourceConfirmation[];
}) {
  const inviterByInvitation = new Map(input.invitations.map((row) => [row.id, row.inviter_id]));
  const inviterNameById = new Map(input.inviters.map((row) => [row.id, row.name?.trim() || "Committee"]));
  const paidByKey = new Map<string, PaymentFact>();

  const marks = resolveMealSentMarks(input);
  const originalByKey = marks.original;
  const updateByKey = marks.update;

  for (const row of input.payments ?? []) {
    const cuisine = normalizeCuisine(row.cuisine);
    if (!cuisine) continue;
    const key = keyFor(row.preorder_id, cuisine);
    const fact: PaymentFact = {
      id: row.id ?? null,
      qty_paid: Math.max(0, Math.round(Number(row.qty_paid ?? 0) || 0)),
      paid_at: row.paid_at ?? null,
      source: row.verified_at ? "restaurant" : normalizeSource(row.source),
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
        id: existing?.id ?? null,
        qty_paid: existing?.qty_paid ?? 0,
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
      const storedPayment = paidByKey.get(key) ?? null;
      // Preserve every recorded payment, including a partial one. A partial
      // payment does not make the whole order line paid, but its quantity and
      // evidence must remain visible so nobody is chased for money already sent.
      const payment = storedPayment
        ? { ...storedPayment, qty_paid: Math.min(qty, storedPayment.qty_paid || qty) }
        : null;
      const fullyPaid = payment ? payment.qty_paid >= qty : false;
      const inviterId = preorder.invitation_id
        ? (inviterByInvitation.get(preorder.invitation_id) ?? null)
        : null;

      // Paid wins over everything: a guest who paid is never chased.
      let exception: string | null = null;
      if (!payment) {
        if (!preorder.invitation_id) exception = "Order is not linked to an invitation";
        else if (!preorder.phone?.trim()) exception = "Guest has no phone number";
      }

      const state: MealCommunicationState = fullyPaid && payment
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
        qty_paid: payment?.qty_paid ?? storedPayment?.qty_paid ?? 0,
        inviter_id: inviterId,
        inviter: inviterId
          ? (inviterNameById.get(inviterId) ?? "Committee")
          : "Not linked to a committee member",
        original_sent_at: originalSentAt,
        update_sent_at: updateSentAt,
        payment_id: payment?.id ?? null,
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
    paid_meal_quantity: rows.reduce((sum, row) => sum + Math.min(row.qty, row.qty_paid), 0),
    unpaid_meal_quantity: rows.reduce(
      (sum, row) => sum + Math.max(0, row.qty - Math.min(row.qty, row.qty_paid)),
      0,
    ),
    paid_confirmed: count("paid_confirmed"),
    paid_reported: count("paid_reported"),
    paid: count("paid_confirmed") + count("paid_reported"),
    needs_update: count("needs_update"),
    update_sent: count("update_sent"),
    exceptions: count("exception"),
    reconciles: false,
    plates_reconcile: false,
  };
  totals.reconciles =
    totals.message_units ===
    totals.paid_confirmed +
      totals.paid_reported +
      totals.needs_update +
      totals.update_sent +
      totals.exceptions;

  const byCuisine = new Map<string, number>();
  for (const row of rows) byCuisine.set(row.cuisine, (byCuisine.get(row.cuisine) ?? 0) + row.qty);
  const cuisineTotal = Array.from(byCuisine.values()).reduce((sum, qty) => sum + qty, 0);
  totals.plates_reconcile = droppedSubmittedQuantities === 0 && cuisineTotal === totals.meal_quantity;

  return { rows, totals, generated_at: new Date().toISOString() };
}

/** Submitted selection entries whose quantity could not be read as a real plate count. */
function countDroppedSelections(selections: unknown) {
  if (!Array.isArray(selections)) return 0;
  let dropped = 0;
  for (const item of selections) {
    if (!item || typeof item !== "object") {
      dropped += 1;
      continue;
    }
    const raw = item as { qty?: unknown; quantity?: unknown };
    const hasQty = raw.qty !== undefined || raw.quantity !== undefined;
    if (!hasQty) continue; // no quantity submitted at all — nothing was dropped
    const qty = Number(raw.qty ?? raw.quantity);
    // A deliberate zero is a cancelled plate, not a dropped one.
    if (!Number.isFinite(qty) || qty < 0) dropped += 1;
  }
  return dropped;
}

/** True when this order unit still needs the payment update text. */
export const isPaidState = (state: MealCommunicationState | undefined) =>
  state === "paid_confirmed" || state === "paid_reported";

/**
 * A recorded text mark whose cuisine is no longer on the guest's order.
 *
 * These marks are real human actions and are NEVER deleted or hidden. They just
 * have no current order line to render on, so they are reported separately so
 * the team can see "we did text this person, for a cuisine they later changed".
 */
export type OrphanSentMark = {
  preorder_id: string;
  name: string;
  phone: string;
  cuisine: string;
  original_sent_at: string | null;
  update_sent_at: string | null;
};

export function findOrphanSentMarks(input: {
  preorders: SourcePreorder[];
  marks: MealSentMarks;
}): OrphanSentMark[] {
  const currentKeys = new Set<string>();
  const preorderById = new Map<string, SourcePreorder>();
  for (const preorder of input.preorders) {
    preorderById.set(preorder.id, preorder);
    for (const selection of parseSelections(preorder.selections)) {
      currentKeys.add(keyFor(preorder.id, selection.cuisine));
    }
  }

  const orphanKeys = new Set<string>();
  for (const key of input.marks.original.keys()) if (!currentKeys.has(key)) orphanKeys.add(key);
  for (const key of input.marks.update.keys()) if (!currentKeys.has(key)) orphanKeys.add(key);

  const out: OrphanSentMark[] = [];
  for (const key of orphanKeys) {
    const separator = key.lastIndexOf("::");
    const preorderId = key.slice(0, separator);
    const cuisine = key.slice(separator + 2);
    const preorder = preorderById.get(preorderId);
    // Marks for a preorder that no longer exists at all are still real history,
    // so they are reported with whatever identity is available.
    out.push({
      preorder_id: preorderId,
      name: preorder?.name?.trim() || "Guest",
      phone: preorder?.phone?.trim() || "",
      cuisine,
      original_sent_at: input.marks.original.get(key) ?? null,
      update_sent_at: input.marks.update.get(key) ?? null,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.cuisine.localeCompare(b.cuisine));
}

