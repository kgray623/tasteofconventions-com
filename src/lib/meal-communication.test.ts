import { describe, expect, it } from "vitest";
import { buildMealCommunicationLedger } from "@/lib/meal-communication";

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
});