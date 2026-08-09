// Server-only helpers for committee-scoped meal texts. Kept out of the
// *.functions.ts module scope so nothing server-only reaches client bundles.
import { phoneTail } from "@/lib/phone";
import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  DEFAULT_ZELLE_UPDATE_TEMPLATE,
  type MealRestaurant,
} from "@/lib/meal-text-defaults";

export const normName = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z]/g, "");

function normalizeCuisine(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("burmese") || lower.includes("myanmar")) return "Myanmar";
  if (lower.includes("africa")) return "African";
  if (lower.includes("indonesia")) return "Indonesian";
  return raw;
}

export type CommitteeMealTextRow = {
  id: string;
  name: string;
  guestName: string;
  phone: string;
  cuisine: string;
  qty: number;
  sent_at: string | null;
  zelle_sent_at: string | null;
  state: "paid" | "needs_update" | "update_sent" | "exception";
  paid_at: string | null;
  exception: string | null;
};

export type CommitteeMealTextsResult = {
  restaurants: MealRestaurant[];
  rows: CommitteeMealTextRow[];
  template: string;
  zelleTemplate: string;
  isAdmin: boolean;
  actingFor: { id: string; name: string } | null;
  committee: Array<{ id: string; name: string }>;
};

export async function resolveIdentity(supabase: any, userId: string) {
  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = new Set(((roleRows ?? []) as { role: string }[]).map((r) => r.role));
  const { data: authUser } = await supabase.auth.getUser();
  const myTail = phoneTail(authUser?.user?.phone);
  const { data: prof } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  return {
    isAdmin: roles.has("admin"),
    isStaff: roles.has("admin") || roles.has("team"),
    myTail,
    myName: normName(prof?.display_name),
  };
}

export async function loadCommitteeMealTexts(
  supabase: any,
  userId: string,
  actingForInviterId: string | null,
): Promise<CommitteeMealTextsResult> {
  const identity = await resolveIdentity(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: inviterRows }, { data: events }] = await Promise.all([
    supabaseAdmin.from("inviters").select("id,host_id,phone,name,active"),
    supabaseAdmin.from("events").select("id").order("starts_at").limit(1),
  ]);

  const inviters = (inviterRows ?? []) as Array<{
    id: string;
    host_id: string | null;
    phone: string | null;
    name: string | null;
    active: boolean | null;
  }>;

  const mine = new Set<string>();
  for (const r of inviters) {
    const tail = phoneTail(r.phone);
    const isMine =
      (r.host_id && r.host_id === userId) ||
      (!!identity.myTail && !!tail && tail === identity.myTail) ||
      (!!identity.myName && normName(r.name) === identity.myName);
    if (isMine && r.id) mine.add(r.id);
  }

  let actingFor: { id: string; name: string } | null = null;
  let targetInviterIds = Array.from(mine);
  if (actingForInviterId && identity.isAdmin) {
    const match = inviters.find((r) => r.id === actingForInviterId);
    if (match) {
      actingFor = { id: match.id, name: (match.name ?? "").trim() || "Committee member" };
      targetInviterIds = [match.id];
    }
  }

  if (!identity.isStaff && mine.size === 0) throw new Error("Forbidden");

  const committee = identity.isAdmin
    ? inviters
        .filter((r) => r.active !== false && (r.name ?? "").trim())
        .map((r) => ({ id: r.id, name: (r.name ?? "").trim() }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    : [];

  const [{ data: restaurants }, { data: setting }, { data: zelleSetting }, ledger] = await Promise.all([
    supabaseAdmin
      .from("restaurants")
      .select(
        "id,name,cuisine,phone,website,order_ready,active,venmo_handle,zelle_name,zelle_phone,chicken_price,beef_price,price_note",
      )
      .order("name"),
    supabaseAdmin.from("app_settings").select("value").eq("key", "meal_text_template").maybeSingle(),
    supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "meal_zelle_text_template")
      .maybeSingle(),
    import("@/lib/meal-communication.server").then(({ loadMealCommunicationLedger }) =>
      loadMealCommunicationLedger(supabaseAdmin),
    ),
  ]);

  const restaurantList = ((restaurants ?? []) as any[])
    .filter((r) => r.active !== false)
    .map((r) => ({
      id: r.id as string,
      name: r.name as string,
      cuisine: (r.cuisine ?? null) as string | null,
      phone: (r.phone ?? null) as string | null,
      website: (r.website ?? null) as string | null,
      venmo_handle: (r.venmo_handle ?? null) as string | null,
      zelle_name: (r.zelle_name ?? null) as string | null,
      zelle_phone: (r.zelle_phone ?? null) as string | null,
      chicken_price:
        r.chicken_price === null || r.chicken_price === undefined ? null : Number(r.chicken_price),
      beef_price: r.beef_price === null || r.beef_price === undefined ? null : Number(r.beef_price),
      price_note: (r.price_note ?? null) as string | null,
      order_ready: r.order_ready !== false,
    })) as MealRestaurant[];

  const template = (setting?.value as string | undefined) ?? DEFAULT_MEAL_TEXT_TEMPLATE;
  const zelleTemplate = (zelleSetting?.value as string | undefined) ?? DEFAULT_ZELLE_UPDATE_TEMPLATE;
  const base = { template, zelleTemplate, restaurants: restaurantList, isAdmin: identity.isAdmin, actingFor, committee };

  const eventId = events?.[0]?.id as string | undefined;
  if (!eventId || targetInviterIds.length === 0) return { ...base, rows: [] };

  const { data: invitations } = await supabaseAdmin
    .from("invitations")
    .select("id,guest_name,guest_phone,inviter_id")
    .eq("event_id", eventId)
    .in("inviter_id", targetInviterIds);

  const invRows = (invitations ?? []) as Array<{
    id: string;
    guest_name: string;
    guest_phone: string | null;
    inviter_id: string | null;
  }>;

  const byInvitationId = new Map(invRows.map((r) => [r.id, r]));
  const byTail = new Map<string, (typeof invRows)[number]>();
  for (const r of invRows) {
    const tail = phoneTail(r.guest_phone);
    if (tail && !byTail.has(tail)) byTail.set(tail, r);
  }

  const { data: preorders } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("id,name,phone,selections,invitation_id")
    .order("name");

  const { data: sends } = await supabaseAdmin
    .from("meal_text_sends")
    .select("preorder_id,cuisine,sent_at");
  const sentByMeal = new Map<string, string>();
  for (const s of (sends ?? []) as any[]) {
    sentByMeal.set(`${s.preorder_id}::${normalizeCuisine(String(s.cuisine ?? ""))}`, s.sent_at);
  }

  const { data: zelleSends } = await supabaseAdmin
    .from("meal_zelle_text_sends")
    .select("preorder_id,cuisine,sent_at");
  const zelleByMeal = new Map<string, string>();
  for (const s of (zelleSends ?? []) as any[]) {
    zelleByMeal.set(`${s.preorder_id}::${normalizeCuisine(String(s.cuisine ?? ""))}`, s.sent_at);
  }



  const rows: CommitteeMealTextRow[] = [];
  const ledgerByKey = new Map(ledger.rows.map((row) => [`${row.id}::${row.cuisine}`, row] as const));
  for (const p of (preorders ?? []) as any[]) {
    const linked =
      (p.invitation_id ? byInvitationId.get(p.invitation_id) : undefined) ??
      byTail.get(phoneTail(p.phone));
    if (!linked) continue;

    const sel = Array.isArray(p.selections) ? p.selections : [];
    const byCuisine = new Map<string, number>();
    for (const item of sel) {
      if (!item || typeof item !== "object") continue;
      const raw = String(item.cuisine ?? item.country ?? "").trim();
      const qty = Number(item.qty);
      if (!raw || !Number.isFinite(qty) || qty <= 0) continue;
      const cuisine = normalizeCuisine(raw);
      byCuisine.set(cuisine, (byCuisine.get(cuisine) ?? 0) + Math.round(qty));
    }
    for (const [cuisine, qty] of byCuisine) {
      const communication = ledgerByKey.get(`${p.id}::${cuisine}`);
      if (!communication) continue;
      rows.push({
        id: p.id as string,
        name: (p.name ?? "").trim() || linked.guest_name || "Guest",
        guestName: linked.guest_name,
        phone: ((p.phone ?? "") as string).trim() || (linked.guest_phone ?? ""),
        cuisine,
        qty,
        sent_at: sentByMeal.get(`${p.id}::${cuisine}`) ?? null,
        zelle_sent_at: zelleByMeal.get(`${p.id}::${cuisine}`) ?? null,
        state: communication.state,
        exception: communication.exception,
      });
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { ...base, rows };
}
