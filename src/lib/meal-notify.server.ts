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
  original: { active_lines: number; active_households: number; live_rows: number; historical_deletes: number; retained_events: number };
  payment_update: { active_lines: number; active_households: number; live_rows: number; historical_deletes: number; retained_events: number };
  actors: Array<{
    actor_id: string | null;
    actor_name: string;
    original_lines: number;
    original_households: number;
    payment_update_lines: number;
    payment_update_households: number;
  }>;
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
  const [{ data: originalRows }, { data: updateRows }, { data: textEvents }, { data: committeeInvitations }, { data: auditRows }] =
    await Promise.all([
      supabaseAdmin.from("meal_text_sends").select("preorder_id,cuisine,marked_by"),
      supabaseAdmin.from("meal_zelle_text_sends").select("preorder_id,cuisine,marked_by"),
      supabaseAdmin
        .from("meal_text_events")
        .select("preorder_id,cuisine,campaign,action,actor_id,event_at,created_at")
        .order("event_at")
        .order("created_at"),
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
  // Counts come from the canonical resolver (events first, legacy fallback), so
  // this rollup can never disagree with the screens.
  const { resolveMealSentMarks } = await import("@/lib/meal-communication");
  const resolved = resolveMealSentMarks({
    originalSends: (originalRows ?? []) as any[],
    updateSends: (updateRows ?? []) as any[],
    textEvents: (textEvents ?? []) as any[],
  });
  const summarize = (keys: Map<string, string>, legacyRows: any[]) => {
    const active = [...keys.keys()].filter((key) => activeKeys.has(key));
    return {
      active_lines: active.length,
      active_households: new Set(active.map((key) => key.split("::")[0])).size,
      live_rows: legacyRows.length,
    };
  };
  const originalSummary = summarize(resolved.original, (originalRows ?? []) as any[]);
  const updateSummary = summarize(resolved.update, (updateRows ?? []) as any[]);

  const deletedOriginal = ((auditRows ?? []) as any[]).filter((row) => row.target_type === "meal_text_sends").length;
  const deletedUpdates = ((auditRows ?? []) as any[]).filter((row) => row.target_type === "meal_zelle_text_sends").length;

  const actorIds = [...new Set([...(originalRows ?? []), ...(updateRows ?? [])].map((row: any) => row.marked_by).filter(Boolean))] as string[];
  const { data: profiles } = actorIds.length
    ? await supabaseAdmin.from("profiles").select("id,display_name").in("id", actorIds)
    : { data: [] };
  const actorNames = new Map(((profiles ?? []) as any[]).map((row) => [row.id, row.display_name?.trim() || "Committee member"]));
  const actors = new Map<string, {
    actor_id: string | null;
    actor_name: string;
    originalKeys: Set<string>;
    originalHouseholds: Set<string>;
    paymentUpdateKeys: Set<string>;
    paymentUpdateHouseholds: Set<string>;
  }>();
  const latestEvents = new Map<string, any>();
  for (const event of (textEvents ?? []) as any[]) {
    latestEvents.set(`${event.campaign}::${event.preorder_id}::${normalizeCuisine(String(event.cuisine ?? ""))}`, event);
  }
  const effectiveOriginal = [...latestEvents.values()]
    .filter((event) => event.campaign === "original" && event.action === "sent")
    .map((event) => ({ ...event, marked_by: event.actor_id }));
  const effectiveUpdates = [...latestEvents.values()]
    .filter((event) => event.campaign === "payment_update" && event.action === "sent")
    .map((event) => ({ ...event, marked_by: event.actor_id }));
  const countActors = (source: any[], kind: "original" | "payment_update") => {
    for (const row of source) {
      const mealKey = `${row.preorder_id}::${normalizeCuisine(String(row.cuisine ?? ""))}`;
      // Actor accounting describes the active order list on this screen.
      // Retained marks for cancelled/changed orders stay in live_rows and audit
      // history, but must not inflate a person's current sent count.
      if (!activeKeys.has(mealKey)) continue;
      const key = row.marked_by ?? "__historical__";
      const entry = actors.get(key) ?? {
        actor_id: row.marked_by ?? null,
        actor_name: row.marked_by ? (actorNames.get(row.marked_by) ?? "Committee member") : "Historical import",
        originalKeys: new Set<string>(),
        originalHouseholds: new Set<string>(),
        paymentUpdateKeys: new Set<string>(),
        paymentUpdateHouseholds: new Set<string>(),
      };
      if (kind === "original") {
        entry.originalKeys.add(mealKey);
        entry.originalHouseholds.add(row.preorder_id);
      } else {
        entry.paymentUpdateKeys.add(mealKey);
        entry.paymentUpdateHouseholds.add(row.preorder_id);
      }
      actors.set(key, entry);
    }
  };
  countActors(effectiveOriginal, "original");
  countActors(effectiveUpdates, "payment_update");

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
      original: {
        ...originalSummary,
        historical_deletes: deletedOriginal,
        retained_events: ((textEvents ?? []) as any[]).filter((event) => event.campaign === "original").length,
      },
      payment_update: {
        ...updateSummary,
        historical_deletes: deletedUpdates,
        retained_events: ((textEvents ?? []) as any[]).filter((event) => event.campaign === "payment_update").length,
      },

      actors: [...actors.values()]
        .map((actor) => ({
          actor_id: actor.actor_id,
          actor_name: actor.actor_name,
          original_lines: actor.originalKeys.size,
          original_households: actor.originalHouseholds.size,
          payment_update_lines: actor.paymentUpdateKeys.size,
          payment_update_households: actor.paymentUpdateHouseholds.size,
        }))
        .sort(
          (a, b) =>
            b.payment_update_households - a.payment_update_households ||
            b.payment_update_lines - a.payment_update_lines ||
            b.original_households - a.original_households,
        ),
    } satisfies MealTextLedgerSummary,
    committee_orders: committeeOrders,
    committee_totals: committeeTotals,
  };
}
