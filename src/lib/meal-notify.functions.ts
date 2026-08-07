import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MealNotifyInviter = {
  inviter_id: string | null;
  name: string;
  invites: number;
  preorders: number;
  meals: number;
  notified: number;
  pending: number;
};

export type MealNotifyPendingRow = {
  id: string;
  name: string;
  phone: string;
  cuisine: string;
  qty: number;
  inviter: string;
  sent_at: string | null;
};

export type MealNotifyRollup = {
  totals: { preorders: number; meals: number; notified: number; pending: number };
  inviters: MealNotifyInviter[];
  pending: MealNotifyPendingRow[];
  generated_at: string;
};

const UNLINKED = "Not linked to a committee member";

function normalizeCuisine(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("burmese") || lower.includes("myanmar")) return "Myanmar";
  if (lower.includes("africa")) return "African";
  if (lower.includes("indonesia")) return "Indonesian";
  return raw;
}

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (!data || data.length === 0) throw new Error("Forbidden");
}

/**
 * Live rollup of who still needs a pre-pay text, grouped by the committee
 * member who owns the guest. Derived on every call from the database so it can
 * never drift; "notified" only ever reflects an explicit human check.
 */
export const getMealNotifyRollup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MealNotifyRollup> => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: preorders }, { data: invitations }, { data: inviters }, { data: sends }] =
      await Promise.all([
        supabaseAdmin
          .from("cuisine_preorders")
          .select("id,name,phone,selections,invitation_id")
          .order("name"),
        supabaseAdmin.from("invitations").select("id,inviter_id"),
        supabaseAdmin.from("inviters").select("id,name"),
        supabaseAdmin.from("meal_text_sends").select("preorder_id,cuisine,sent_at"),
      ]);

    const sentByMeal = new Map<string, string>();
    for (const s of (sends ?? []) as any[]) {
      sentByMeal.set(`${s.preorder_id}::${normalizeCuisine(String(s.cuisine ?? ""))}`, s.sent_at);
    }


    const inviterNameById = new Map<string, string>(
      ((inviters ?? []) as any[]).map((r) => [r.id as string, (r.name as string) ?? "Committee"]),
    );
    const inviterIdByInvitation = new Map<string, string | null>(
      ((invitations ?? []) as any[]).map((r) => [r.id as string, (r.inviter_id as string) ?? null]),
    );

    const invitesByInviter = new Map<string, number>();
    for (const row of (invitations ?? []) as any[]) {
      if (!row.inviter_id) continue;
      invitesByInviter.set(row.inviter_id, (invitesByInviter.get(row.inviter_id) ?? 0) + 1);
    }

    const byInviter = new Map<string, MealNotifyInviter>();
    const pending: MealNotifyPendingRow[] = [];
    const totals = { preorders: 0, meals: 0, notified: 0, pending: 0 };

    for (const p of (preorders ?? []) as any[]) {
      const selections = Array.isArray(p.selections) ? p.selections : [];
      const byCuisine = new Map<string, number>();
      for (const item of selections) {
        if (!item || typeof item !== "object") continue;
        const raw = String(item.cuisine ?? item.country ?? "").trim();
        const qty = Number(item.qty);
        if (!raw || !Number.isFinite(qty) || qty <= 0) continue;
        const cuisine = normalizeCuisine(raw);
        byCuisine.set(cuisine, (byCuisine.get(cuisine) ?? 0) + Math.round(qty));
      }
      if (byCuisine.size === 0) continue;

      const inviterId = p.invitation_id
        ? (inviterIdByInvitation.get(p.invitation_id) ?? null)
        : null;
      const key = inviterId ?? "__unlinked__";
      const name = inviterId ? (inviterNameById.get(inviterId) ?? "Committee") : UNLINKED;
      const bucket =
        byInviter.get(key) ??
        ({
          inviter_id: inviterId,
          name,
          invites: inviterId ? (invitesByInviter.get(inviterId) ?? 0) : 0,
          preorders: 0,
          meals: 0,
          notified: 0,
          pending: 0,
        } satisfies MealNotifyInviter);
      byInviter.set(key, bucket);

      const meals = [...byCuisine.values()].reduce((s, q) => s + q, 0);
      const notified = !!p.meal_text_sent_at;

      bucket.preorders += 1;
      bucket.meals += meals;
      if (notified) bucket.notified += 1;
      else bucket.pending += 1;

      totals.preorders += 1;
      totals.meals += meals;
      if (notified) totals.notified += 1;
      else totals.pending += 1;

      if (!notified) {
        for (const [cuisine, qty] of byCuisine) {
          pending.push({
            id: p.id as string,
            name: (p.name ?? "").trim() || "Guest",
            phone: (p.phone ?? "").trim(),
            cuisine,
            qty,
            inviter: name,
            sent_at: null,
          });
        }
      }
    }

    const list = [...byInviter.values()].sort(
      (a, b) => b.pending - a.pending || a.name.localeCompare(b.name),
    );
    pending.sort(
      (a, b) => a.inviter.localeCompare(b.inviter) || a.name.localeCompare(b.name),
    );

    return { totals, inviters: list, pending, generated_at: new Date().toISOString() };
  });
