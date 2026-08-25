import { describe, expect, it } from "vitest";
import { buildMealCommunicationLedger, resolveMealSentMarks } from "@/lib/meal-communication";

const base = {
  preorders: [
    {
      id: "p1",
      invitation_id: "i1",
      name: "Guest One",
      phone: "8085550101",
      selections: [
        { cuisine: "African", qty: 2 },
        { cuisine: "Burmese", qty: 1 },
      ],
    },
  ],
  invitations: [{ id: "i1", inviter_id: "v1" }],
  inviters: [{ id: "v1", name: "Committee One" }],
  originalSends: [],
  updateSends: [],
  payments: [],
  confirmations: [],
};

describe("meal communication accounting", () => {
  it("keeps plates, households, and order lines as separate units", () => {
    const ledger = buildMealCommunicationLedger(base);
    expect(ledger.totals).toMatchObject({ meal_quantity: 3, households: 1, message_units: 2 });
    expect(ledger.totals.reconciles).toBe(true);
    expect(ledger.totals.plates_reconcile).toBe(true);
  });

  it("flags plates_reconcile false when a submitted meal quantity is dropped", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      preorders: [
        {
          ...base.preorders[0],
          selections: [
            { cuisine: "African", qty: 2 },
            { cuisine: "Burmese", qty: "two" as unknown as number },
          ],
        },
      ],
    });
    // The unreadable quantity must never disappear silently.
    expect(ledger.totals.meal_quantity).toBe(2);
    expect(ledger.totals.plates_reconcile).toBe(false);
  });

  it("keeps plates_reconcile true for a deliberately cancelled zero-quantity meal", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      preorders: [
        {
          ...base.preorders[0],
          selections: [
            { cuisine: "African", qty: 2 },
            { cuisine: "Burmese", qty: 0 },
          ],
        },
      ],
    });
    expect(ledger.totals.meal_quantity).toBe(2);
    expect(ledger.totals.plates_reconcile).toBe(true);
  });

  it("derives current text status from the latest append-only event", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      textEvents: [
        { preorder_id: "p1", cuisine: "African", campaign: "payment_update", action: "sent", event_at: "2026-08-12T10:00:00Z", created_at: "2026-08-12T10:00:00Z" },
        { preorder_id: "p1", cuisine: "African", campaign: "payment_update", action: "reversed", event_at: "2026-08-12T11:00:00Z", created_at: "2026-08-12T11:00:00Z" },
      ],
    });
    expect(ledger.rows.find((row) => row.cuisine === "African")?.state).toBe("needs_update");
  });

  it("keeps unpaid orders in separate not-texted and texted-payment-due states", () => {
    const notTexted = buildMealCommunicationLedger(base);
    expect(notTexted.rows.find((row) => row.cuisine === "African")?.state).toBe("needs_update");

    const texted = buildMealCommunicationLedger({
      ...base,
      textEvents: [
        { preorder_id: "p1", cuisine: "African", campaign: "payment_update", action: "sent", event_at: "2026-08-19T10:00:00Z", created_at: "2026-08-19T10:00:00Z" },
      ],
    });
    expect(texted.rows.find((row) => row.cuisine === "African")?.state).toBe("update_sent");
  });

  it("removes reported and confirmed payments from both unpaid queues", () => {
    const reported = buildMealCommunicationLedger({
      ...base,
      payments: [{ preorder_id: "p1", cuisine: "African", qty_paid: 2, paid_at: "2026-08-19T11:00:00Z", source: "guest_reported" }],
    });
    expect(reported.rows.find((row) => row.cuisine === "African")?.state).toBe("paid_reported");

    const confirmed = buildMealCommunicationLedger({
      ...base,
      confirmations: [{ preorder_id: "p1", cuisine: "African", confirmed: true, confirmed_at: "2026-08-19T12:00:00Z" }],
    });
    expect(confirmed.rows.find((row) => row.cuisine === "African")?.state).toBe("paid_confirmed");
  });

  it("does not let payment for one cuisine hide another cuisine", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      payments: [{ preorder_id: "p1", cuisine: "African", qty_paid: 2, paid_at: "2026-08-19T11:00:00Z", source: "restaurant", verified_at: "2026-08-19T11:00:00Z" }],
    });
    expect(ledger.rows.find((row) => row.cuisine === "African")?.state).toBe("paid_confirmed");
    expect(ledger.rows.find((row) => row.cuisine === "Myanmar")?.state).toBe("needs_update");
  });

  it("does not treat a partial payment as paid for the order line", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      payments: [{ preorder_id: "p1", cuisine: "African", qty_paid: 1, paid_at: "2026-08-19T11:00:00Z", source: "guest_reported" }],
    });
    const african = ledger.rows.find((row) => row.cuisine === "African");
    expect(african?.state).toBe("needs_update");
    expect(african?.qty).toBe(2);
    expect(african?.qty_paid).toBe(1);
  });

  it("places every active order line in exactly one payment status bucket", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      textEvents: [
        { preorder_id: "p1", cuisine: "Burmese", campaign: "payment_update", action: "sent", event_at: "2026-08-19T10:00:00Z", created_at: "2026-08-19T10:00:00Z" },
      ],
      payments: [{ preorder_id: "p1", cuisine: "African", qty_paid: 2, paid_at: "2026-08-19T11:00:00Z", source: "guest_reported" }],
    });

    for (const row of ledger.rows) {
      const buckets = [
        row.state === "paid_confirmed",
        row.state === "paid_reported",
        row.state === "update_sent",
        row.state === "needs_update",
        row.state === "exception",
      ].filter(Boolean);
      expect(buckets).toHaveLength(1);
    }
  });
});
describe("single source of truth for sent marks and confirmations", () => {
  it("treats an event-only sent mark as sent, with no legacy row", () => {
    const marks = resolveMealSentMarks({
      originalSends: [],
      updateSends: [],
      textEvents: [
        {
          preorder_id: "p1",
          cuisine: "Burmese",
          campaign: "payment_update",
          action: "sent",
          event_at: "2026-08-19T10:00:00Z",
          created_at: "2026-08-19T10:00:00Z",
          actor_id: "u1",
        },
      ],
    });
    // "Burmese" and "Myanmar" must resolve to the same key.
    expect(marks.update.get("p1::Myanmar")).toBe("2026-08-19T10:00:00Z");
    expect(marks.updateActorId.get("p1::Myanmar")).toBe("u1");
  });

  it("lets the newest event reverse a legacy sent row", () => {
    const marks = resolveMealSentMarks({
      updateSends: [{ preorder_id: "p1", cuisine: "Myanmar", sent_at: "2026-08-10T00:00:00Z" }],
      textEvents: [
        {
          preorder_id: "p1",
          cuisine: "myanmar",
          campaign: "payment_update",
          action: "reversed",
          event_at: "2026-08-12T00:00:00Z",
          created_at: "2026-08-12T00:00:00Z",
        },
      ],
    });
    expect(marks.update.has("p1::Myanmar")).toBe(false);
  });

  it("shows an event-only sent mark as update_sent in the ledger", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      textEvents: [
        {
          preorder_id: "p1",
          cuisine: "Burmese",
          campaign: "payment_update",
          action: "sent",
          event_at: "2026-08-19T10:00:00Z",
          created_at: "2026-08-19T10:00:00Z",
        },
      ],
    });
    const myanmar = ledger.rows.find((row) => row.cuisine === "Myanmar");
    expect(myanmar?.state).toBe("update_sent");
    expect(myanmar?.update_sent_at).toBe("2026-08-19T10:00:00Z");
  });

  it("counts a restaurant confirmation with no verified payment as confirmed paid", () => {
    const ledger = buildMealCommunicationLedger({
      ...base,
      payments: [
        { preorder_id: "p1", cuisine: "African", qty_paid: 2, paid_at: "2026-08-08T00:00:00Z", source: "guest_reported", verified_at: null },
      ],
      confirmations: [
        { preorder_id: "p1", cuisine: "African", confirmed: true, confirmed_at: "2026-08-13T00:00:00Z" },
      ],
    });
    const african = ledger.rows.find((row) => row.cuisine === "African");
    expect(african?.state).toBe("paid_confirmed");
    expect(african?.verified_at).toBe("2026-08-13T00:00:00Z");
  });
});

describe("orphan sent marks", () => {
  const marksFor = (textEvents: any[]) =>
    resolveMealSentMarks({ originalSends: [], updateSends: [], textEvents });

  it("reports a sent mark whose cuisine was removed from the order", async () => {
    const { findOrphanSentMarks } = await import("@/lib/meal-communication");
    const marks = marksFor([
      {
        preorder_id: "p1",
        cuisine: "Indonesian",
        campaign: "payment_update",
        action: "sent",
        event_at: "2026-08-12T10:00:00Z",
        created_at: "2026-08-12T10:00:00Z",
      },
    ]);
    const orphans = findOrphanSentMarks({ preorders: base.preorders, marks });
    expect(orphans).toHaveLength(1);
    expect(orphans[0]).toMatchObject({
      preorder_id: "p1",
      name: "Guest One",
      cuisine: "Indonesian",
      update_sent_at: "2026-08-12T10:00:00Z",
    });
  });

  it("does not report marks for cuisines still on the order, including alias spellings", async () => {
    const { findOrphanSentMarks } = await import("@/lib/meal-communication");
    const marks = marksFor([
      {
        preorder_id: "p1",
        cuisine: "burmese",
        campaign: "payment_update",
        action: "sent",
        event_at: "2026-08-12T10:00:00Z",
        created_at: "2026-08-12T10:00:00Z",
      },
      {
        preorder_id: "p1",
        cuisine: "AFRICAN",
        campaign: "original",
        action: "sent",
        event_at: "2026-08-01T10:00:00Z",
        created_at: "2026-08-01T10:00:00Z",
      },
    ]);
    expect(findOrphanSentMarks({ preorders: base.preorders, marks })).toEqual([]);
  });

  it("does not report a reversed mark as orphan history", async () => {
    const { findOrphanSentMarks } = await import("@/lib/meal-communication");
    const marks = marksFor([
      {
        preorder_id: "p1",
        cuisine: "Indonesian",
        campaign: "payment_update",
        action: "sent",
        event_at: "2026-08-12T10:00:00Z",
        created_at: "2026-08-12T10:00:00Z",
      },
      {
        preorder_id: "p1",
        cuisine: "Indonesian",
        campaign: "payment_update",
        action: "reversed",
        event_at: "2026-08-12T11:00:00Z",
        created_at: "2026-08-12T11:00:00Z",
      },
    ]);
    expect(findOrphanSentMarks({ preorders: base.preorders, marks })).toEqual([]);
  });
});
