import { loadMealCommunicationLedger } from "@/lib/meal-communication.server";

export type MealNotifyInviter = {
  inviter_id: string | null;
  name: string;
  paid_confirmed: number;
  paid_reported: number;
  needs_update: number;
  update_sent: number;
  exceptions: number;
};

export type MealTextLedgerSummary = {
  original: { active_lines: number; active_households: number; live_rows: number; historical_deletes: number };
  payment_update: { active_lines: number; active_households: number; live_rows: number; historical_deletes: number };
  actors: Array<{ actor_id: string | null; actor_name: string; original: number; payment_update: number }>;
};

export type CommitteeMealAuditRow = {
  invitation_id: string;
  name: string;
  phone: string;
  status: "active_order" | "no_order" | "linkage_exception";
  order_lines: number;
  plates: number;
  selections: string;
};

export async function loadMealNotifyRollup(supabaseAdmin: any) {
  const ledger = await loadMealCommunicationLedger(supabaseAdmin);
  const byInviter = new Map<string, MealNotifyInviter>();
  for (const row of ledger.rows) {
    const key = row.inviter_id ?? "__unlinked__";
    const bucket = byInviter.get(key) ?? {
      inviter_id: row.inviter_id,
      name: row.inviter,
      paid_confirmed: 0,
      paid_reported: 0,
      needs_update: 0,
      update_sent: 0,
      exceptions: 0,
    };
    const bucketKey = row.state === "exception" ? "exceptions" : row.state;
    bucket[bucketKey] += 1;
    byInviter.set(key, bucket);
  }
  const [{ data: originalRows }, { data: updateRows }, { data: committeeInvitations }, { data: auditRows }] =
    await Promise.all([
      supabaseAdmin.from("meal_text_sends").select("preorder_id,cuisine,marked_by"),
      supabaseAdmin.from("meal_zelle_text_sends").select("preorder_id,cuisine,marked_by"),
      supabaseAdmin.from("invitations").select("id,guest_name,guest_phone").eq("is_committee", true).order("guest_name"),
      supabaseAdmin
        .from("audit_log")
        .select("action,target_type")
        .in("target_type", ["meal_text_sends", "meal_zelle_text_sends"])
        .like("action", "DELETE%"),
    ]);

  const normalizeCuisine = (raw: string) => {
    const lower = raw.toLowerCase();
    if (lower.includes("myanmar") || lower.includes("burmese")) return "Myanmar";
    if (lower.includes("african") || lower.includes("mozambique")) return "African";
    if (lower.includes("indonesia") || lower.includes("jakarta")) return "Indonesian";
    return raw.trim();
  };
  const activeKeys = new Set(ledger.rows.map((row) => `${row.id}::${row.cuisine}`));
  const summarize = (source: any[]) => {
    const active = source.filter((row) => activeKeys.has(`${row.preorder_id}::${normalizeCuisine(String(row.cuisine ?? ""))}`));
    return {
      active_lines: new Set(active.map((row) => `${row.preorder_id}::${normalizeCuisine(String(row.cuisine ?? ""))}`)).size,
      active_households: new Set(active.map((row) => row.preorder_id)).size,
      live_rows: source.length,
    };
  };
  const originalSummary = summarize((originalRows ?? []) as any[]);
  const updateSummary = summarize((updateRows ?? []) as any[]);
  const deletedOriginal = ((auditRows ?? []) as any[]).filter((row) => row.target_type === "meal_text_sends").length;
  const deletedUpdates = ((auditRows ?? []) as any[]).filter((row) => row.target_type === "meal_zelle_text_sends").length;

  const actorIds = [...new Set([...(originalRows ?? []), ...(updateRows ?? [])].map((row: any) => row.marked_by).filter(Boolean))] as string[];
  const { data: profiles } = actorIds.length
    ? await supabaseAdmin.from("profiles").select("id,display_name").in("id", actorIds)
    : { data: [] };
  const actorNames = new Map(((profiles ?? []) as any[]).map((row) => [row.id, row.display_name?.trim() || "Committee member"]));
  const actors = new Map<string, { actor_id: string | null; actor_name: string; original: number; payment_update: number }>();
  const countActors = (source: any[], kind: "original" | "payment_update") => {
    for (const row of source) {
      const key = row.marked_by ?? "__historical__";
      const entry = actors.get(key) ?? {
        actor_id: row.marked_by ?? null,
        actor_name: row.marked_by ? (actorNames.get(row.marked_by) ?? "Committee member") : "Historical import",
        original: 0,
        payment_update: 0,
      };
      entry[kind] += 1;
      actors.set(key, entry);
    }
  };
  countActors((originalRows ?? []) as any[], "original");
  countActors((updateRows ?? []) as any[], "payment_update");

  const rowsByInvitation = new Map<string, typeof ledger.rows>();
  for (const row of ledger.rows) {
    if (!row.invitation_id) continue;
    const list = rowsByInvitation.get(row.invitation_id) ?? [];
    list.push(row);
    rowsByInvitation.set(row.invitation_id, list);
  }
  const committeeOrders: CommitteeMealAuditRow[] = ((committeeInvitations ?? []) as any[]).map((invitation) => {
    const orders = rowsByInvitation.get(invitation.id) ?? [];
    return {
      invitation_id: invitation.id,
      name: invitation.guest_name?.trim() || "Committee member",
      phone: invitation.guest_phone?.trim() || "",
      status: orders.length > 0 ? "active_order" : "no_order",
      order_lines: orders.length,
      plates: orders.reduce((sum, row) => sum + row.qty, 0),
      selections: orders.map((row) => `${row.cuisine} ×${row.qty}`).join(" · "),
    };
  });
  const committeeTotals = {
    members: committeeOrders.length,
    active_orderers: committeeOrders.filter((row) => row.status === "active_order").length,
    no_order: committeeOrders.filter((row) => row.status === "no_order").length,
    order_lines: committeeOrders.reduce((sum, row) => sum + row.order_lines, 0),
    plates: committeeOrders.reduce((sum, row) => sum + row.plates, 0),
  };

  return {
    ...ledger,
    inviters: [...byInviter.values()].sort(
      (a, b) =>
        b.needs_update - a.needs_update ||
        b.update_sent - a.update_sent ||
        a.name.localeCompare(b.name),
    ),
    text_accounting: {
      original: { ...originalSummary, historical_deletes: deletedOriginal },
      payment_update: { ...updateSummary, historical_deletes: deletedUpdates },
      actors: [...actors.values()].sort((a, b) => b.payment_update - a.payment_update || b.original - a.original),
    } satisfies MealTextLedgerSummary,
    committee_orders: committeeOrders,
    committee_totals: committeeTotals,
  };
}
