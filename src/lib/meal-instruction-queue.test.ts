import { describe, expect, it } from "vitest";
import { buildMealInstructionQueue, reconstructReportedTextBatch } from "@/lib/meal-instruction-queue";
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

  it("uses only the reported number of chronological contacts and exposes overflow marks", () => {
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
    const batch = reconstructReportedTextBatch(rows, events, 2);
    expect(batch.reconstructed_contact_ids).toEqual(["preorder-1", "preorder-2"]);
    expect(batch.overflow.map((contact) => contact.id)).toEqual(["preorder-3"]);
    expect(buildMealInstructionQueue(rows, [], batch.reconstructed_contact_ids).map((contact) => contact.id))
      .toEqual(["preorder-3"]);
  });
});