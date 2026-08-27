import { describe, expect, it } from "vitest";
import { unpaidMealRows } from "@/hooks/use-my-unpaid-meals";
import type { CommitteeMealTextRow } from "@/lib/committee-meal-texts.functions";

const row = (overrides: Partial<CommitteeMealTextRow>): CommitteeMealTextRow => ({
  id: "preorder-1",
  invitationId: "invitation-1",
  name: "Juliette and Sasha Sossou-Etse",
  guestName: "Juliet Sossou-Etse",
  phone: "402-810-4177",
  cuisine: "Indonesian",
  qty: 2,
  qty_paid: 2,
  sent_at: null,
  zelle_sent_at: null,
  state: "paid_reported",
  paid_at: "2026-08-27T17:02:59Z",
  paid_source: "committee_recorded",
  paid_note: "Paid directly to Koen",
  exception: null,
  inviterId: "tina",
  inviterName: "Tina Santana",
  ...overrides,
});

describe("unpaid meal rows", () => {
  it("excludes a fully committee-reported order awaiting restaurant confirmation", () => {
    expect(unpaidMealRows([row({})])).toEqual([]);
  });

  it("keeps only active unpaid rows returned by the current server ledger", () => {
    const unpaid = row({
      id: "active-unpaid",
      guestName: "Active Guest",
      qty: 1,
      qty_paid: 0,
      state: "needs_update",
      paid_at: null,
      paid_source: null,
    });
    // Archived rows are absent from the server response, so a fresh response
    // containing only the active row cannot retain an older deleted household.
    expect(unpaidMealRows([unpaid])).toEqual([unpaid]);
  });
});