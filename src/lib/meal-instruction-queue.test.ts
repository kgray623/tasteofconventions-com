import { describe, expect, it } from "vitest";
import { buildMealInstructionQueue } from "@/lib/meal-instruction-queue";
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
});