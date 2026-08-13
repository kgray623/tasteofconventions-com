import { describe, expect, it } from "vitest";
import { buildMealInstructionQueue, reconcileExplicitTextBatch } from "@/lib/meal-instruction-queue";
import type { MealTextRow } from "@/lib/meal-text-defaults";

const paidRow: MealTextRow = {
  id: "preorder-1",
  name: "Paid Guest",
  phone: "4025550101",
  cuisine: "African",
  qty: 1,
  sent_at: null,
  zelle_sent_at: "2026-08-12T10:00:00Z",
  inviter: "Committee Member",
  state: "paid_confirmed",
};

describe("meal instruction queue", () => {
  it("keeps a paid preorder until its physical instruction text is confirmed", () => {
    expect(buildMealInstructionQueue([paidRow], [])).toHaveLength(1);
    expect(buildMealInstructionQueue([paidRow], [{
      event_id: "event-1",
      preorder_id: paidRow.id,
      cuisine: paidRow.cuisine,
      event_at: "2026-08-12T10:00:00Z",
      decision: "confirmed",
      note: null,
      reviewed_at: "2026-08-12T10:01:00Z",
    }])).toHaveLength(0);
  });

  it("subtracts every active contact explicitly marked on August 12 without an inferred cap", () => {
    const rows = [
      paidRow,
      { ...paidRow, id: "preorder-2", name: "Second Guest" },
      { ...paidRow, id: "preorder-3", name: "Third Guest" },
    ];
    const events = rows.map((row, index) => ({
      preorder_id: row.id,
      event_at: `2026-08-12T12:0${index}:00Z`,
      campaign: "payment_update",
      action: "sent",
    }));
    const batch = reconcileExplicitTextBatch(rows, events);
    expect(batch.reconstructed_contact_ids).toEqual(["preorder-1", "preorder-2", "preorder-3"]);
    expect(batch.reconstructed_count).toBe(3);
    expect(buildMealInstructionQueue(rows, [], batch.reconstructed_contact_ids).map((contact) => contact.id))
      .toEqual([]);
  });

  it("does not let an older legacy mark hide a contact from the August 12 list", () => {
    const batch = reconcileExplicitTextBatch([paidRow], [{
      preorder_id: paidRow.id,
      event_at: "2026-08-11T12:00:00Z",
      campaign: "payment_update",
      action: "sent",
      evidence_source: "legacy_live_mark",
    }]);
    expect(batch.reconstructed_contact_ids).toEqual([]);
    expect(buildMealInstructionQueue([paidRow], [], batch.reconstructed_contact_ids)).toHaveLength(1);
  });
});