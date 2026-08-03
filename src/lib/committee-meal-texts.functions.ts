import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { phoneTail } from "@/lib/phone";
import {
  DEFAULT_MEAL_TEXT_TEMPLATE,
  type MealRestaurant,
  type MealTextRow,
} from "@/lib/meal-texts.functions";

const normName = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z]/g, "");

function normalizeCuisine(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("burmese") || lower.includes("myanmar")) return "Myanmar";
  if (lower.includes("africa")) return "African";
  if (lower.includes("indonesia")) return "Indonesian";
  return raw;
}

export type CommitteeMealTextRow = MealTextRow & { guestName: string };

export type CommitteeMealTextsResult = {
  restaurants: MealRestaurant[];
  rows: CommitteeMealTextRow[];
  template: string;
  isAdmin: boolean;
  actingFor: { id: string; name: string } | null;
  committee: Array<{ id: string; name: string }>;
};

async function resolveIdentity(supabase: any, userId: string) {
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
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

export const getMyMealTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ actingForInviterId: z.string().uuid().nullable().optional() })
      .default({})
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<CommitteeMealTextsResult> => {
    const { supabase, userId } = context;
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
    if (data.actingForInviterId && identity.isAdmin) {
      const match = inviters.find((r) => r.id === data.actingForInviterId);
      if (match) {
        actingFor = { id: match.id, name: (match.name ?? "").trim() || "Committee member" };
        targetInviterIds = [match.id];
      }
    }

    if (!identity.isStaff && mine.size === 0) throw new Error("Forbidden");

    const eventId = events?.[0]?.id as string | undefined;

    const committee = identity.isAdmin
      ? inviters
          .filter((r) => r.active !== false && (r.name ?? "").trim())
          .map((r) => ({ id: r.id, name: (r.name ?? "").trim() }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      : [];

    const base = {
      template: DEFAULT_MEAL_TEXT_TEMPLATE,
      isAdmin: identity.isAdmin,
      actingFor,
      committee,
    };

    const [{ data: restaurants }, { data: setting }] = await Promise.all([
      supabaseAdmin
        .from("restaurants")
        .select("id,name,cuisine,phone,website,order_ready,active")
        .order("name"),
      supabaseAdmin.from("app_settings").select("value").eq("key", "meal_text_template").maybeSingle(),
    ]);

    const restaurantList = ((restaurants ?? []) as any[])
      .filter((r) => r.active !== false)
      .map((r) => ({
        id: r.id as string,
        name: r.name as string,
        cuisine: (r.cuisine ?? null) as string | null,
        phone: (r.phone ?? null) as string | null,
        website: (r.website ?? null) as string | null,
        order_ready: r.order_ready !== false,
      })) as MealRestaurant[];

    const template = (setting?.value as string | undefined) ?? DEFAULT_MEAL_TEXT_TEMPLATE;

    if (!eventId || targetInviterIds.length === 0) {
      return { ...base, template, restaurants: restaurantList, rows: [] };
    }

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
      .select("id,name,phone,selections,meal_text_sent_at,invitation_id")
      .order("name");

    const rows: CommitteeMealTextRow[] = [];
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
        rows.push({
          id: p.id as string,
          name: (p.name ?? "").trim() || linked.guest_name || "Guest",
          guestName: linked.guest_name,
          phone: ((p.phone ?? "") as string).trim() || (linked.guest_phone ?? ""),
          cuisine,
          qty,
          sent_at: p.meal_text_sent_at ?? null,
        });
      }
    }

    return { ...base, template, restaurants: restaurantList, rows };
  });

export const markMyMealTextSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        sent: z.boolean(),
        actingForInviterId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const identity = await resolveIdentity(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!identity.isStaff) {
      // Committee members may only mark their own guests' preorders.
      const allowed = await getMyMealTexts({
        data: { actingForInviterId: data.actingForInviterId ?? null },
      } as never);
      const mineIds = new Set(allowed.rows.map((r) => r.id));
      if (data.ids.some((id) => !mineIds.has(id))) throw new Error("Forbidden");
    }

    const sentAt = data.sent ? new Date().toISOString() : null;
    const { error } = await supabaseAdmin
      .from("cuisine_preorders")
      .update({ meal_text_sent_at: sentAt })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, sentAt };
  });
