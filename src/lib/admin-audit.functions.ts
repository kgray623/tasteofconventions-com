import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export type AudienceTotals = {
  uploaded: number;
  sent: number;
  yes: number;
  yes_people: number;
  no: number;
  maybe: number;
  waitlist: number;
  waitlist_people: number;
  pending: number;
  responses: number;
  food_orders: number;
  food_meals: number;
};

const emptyTotals = (): AudienceTotals => ({
  uploaded: 0,
  sent: 0,
  yes: 0,
  yes_people: 0,
  no: 0,
  maybe: 0,
  waitlist: 0,
  waitlist_people: 0,
  pending: 0,
  responses: 0,
  food_orders: 0,
  food_meals: 0,
});

type InvRow = {
  id: string;
  guest_name: string | null;
  guest_phone: string | null;
  is_committee: boolean | null;
  invite_sent_at: string | null;
};
type RsvpRow = {
  invitation_id: string;
  status: string | null;
  party_size: number | null;
  attendance_mode: string | null;
  ordering_food: boolean | null;
};
type PreRow = {
  id: string;
  invitation_id: string | null;
  name: string | null;
  phone: string | null;
  selections: unknown;
};

function countMeals(selections: unknown): number {
  if (!Array.isArray(selections)) return 0;
  let total = 0;
  for (const item of selections) {
    if (!item || typeof item !== "object") continue;
    const qty = Number((item as { qty?: unknown }).qty);
    if (Number.isFinite(qty) && qty > 0) total += Math.round(qty);
  }
  return total;
}

export const getAdminAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [invRes, rsvpRes, preRes] = await Promise.all([
      supabaseAdmin
        .from("invitations")
        .select("id,guest_name,guest_phone,is_committee,invite_sent_at"),
      supabaseAdmin
        .from("rsvps")
        .select("invitation_id,status,party_size,attendance_mode,ordering_food"),
      supabaseAdmin
        .from("cuisine_preorders")
        .select("id,invitation_id,name,phone,selections"),
    ]);

    if (invRes.error) throw new Error(invRes.error.message);
    if (rsvpRes.error) throw new Error(rsvpRes.error.message);
    if (preRes.error) throw new Error(preRes.error.message);

    const invs = (invRes.data ?? []) as InvRow[];
    const rsvps = (rsvpRes.data ?? []) as RsvpRow[];
    const preorders = (preRes.data ?? []) as PreRow[];

    // Build lookup maps. RSVPs are 1:1 with invitations (unique constraint),
    // but we still detect duplicates defensively.
    const rsvpByInv = new Map<string, RsvpRow>();
    const dupRsvps: string[] = [];
    for (const r of rsvps) {
      if (rsvpByInv.has(r.invitation_id)) dupRsvps.push(r.invitation_id);
      else rsvpByInv.set(r.invitation_id, r);
    }
    const preByInv = new Map<string, PreRow>();
    for (const p of preorders) {
      if (p.invitation_id) preByInv.set(p.invitation_id, p);
    }

    const guests = emptyTotals();
    const committee = emptyTotals();
    const invIds = new Set<string>();

    for (const inv of invs) {
      invIds.add(inv.id);
      const bucket = inv.is_committee ? committee : guests;
      bucket.uploaded += 1;
      if (inv.invite_sent_at) bucket.sent += 1;

      const r = rsvpByInv.get(inv.id);
      const status = r?.status ?? null;
      const party = r?.party_size ?? 1;
      if (!status) {
        bucket.pending += 1;
      } else {
        bucket.responses += 1;
        if (status === "yes") {
          bucket.yes += 1;
          bucket.yes_people += party;
        } else if (status === "no") {
          bucket.no += 1;
        } else if (status === "maybe") {
          bucket.maybe += 1;
        } else if (status === "waitlist") {
          bucket.waitlist += 1;
          bucket.waitlist_people += party;
        } else {
          bucket.pending += 1;
        }
      }

      const pre = preByInv.get(inv.id);
      if (pre) {
        const meals = countMeals(pre.selections);
        if (meals > 0) {
          bucket.food_orders += 1;
          bucket.food_meals += meals;
        }
      }
    }

    // Orphan / unlinked detection
    const orphanRsvps = rsvps.filter((r) => !invIds.has(r.invitation_id)).length;
    const unlinkedPreorders = preorders
      .filter((p) => !p.invitation_id || !invIds.has(p.invitation_id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        meals: countMeals(p.selections),
        selections: p.selections,
      }));

    const all: AudienceTotals = {
      uploaded: guests.uploaded + committee.uploaded,
      sent: guests.sent + committee.sent,
      yes: guests.yes + committee.yes,
      yes_people: guests.yes_people + committee.yes_people,
      no: guests.no + committee.no,
      maybe: guests.maybe + committee.maybe,
      waitlist: guests.waitlist + committee.waitlist,
      waitlist_people: guests.waitlist_people + committee.waitlist_people,
      pending: guests.pending + committee.pending,
      responses: guests.responses + committee.responses,
      food_orders: guests.food_orders + committee.food_orders,
      food_meals: guests.food_meals + committee.food_meals,
    };

    return {
      guests,
      committee,
      all,
      reconciliation: {
        invitations_total: invs.length,
        accounted_for: invs.length, // every invitation is in either responded or pending
        duplicate_rsvp_invitations: dupRsvps.length,
        orphan_rsvps: orphanRsvps,
        unlinked_preorders: unlinkedPreorders,
      },
    };
  });

export const getReconciliationRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [invRes, rsvpRes, preRes] = await Promise.all([
      supabaseAdmin
        .from("invitations")
        .select("id,guest_name,guest_phone,guest_email,is_committee,invite_sent_at,created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("rsvps")
        .select("invitation_id,status,party_size,attendance_mode,ordering_food,responded_at"),
      supabaseAdmin
        .from("cuisine_preorders")
        .select("invitation_id,selections,updated_at"),
    ]);

    if (invRes.error) throw new Error(invRes.error.message);
    if (rsvpRes.error) throw new Error(rsvpRes.error.message);
    if (preRes.error) throw new Error(preRes.error.message);

    const rsvpByInv = new Map<string, any>();
    for (const r of (rsvpRes.data ?? []) as any[]) rsvpByInv.set(r.invitation_id, r);
    const preByInv = new Map<string, any>();
    for (const p of (preRes.data ?? []) as any[]) {
      if (p.invitation_id) preByInv.set(p.invitation_id, p);
    }

    const rows = ((invRes.data ?? []) as any[]).map((inv) => {
      const r = rsvpByInv.get(inv.id);
      const p = preByInv.get(inv.id);
      const selections = Array.isArray(p?.selections) ? p.selections : [];
      const selectionText = selections
        .map((s: any) => {
          const cuisine = String(s?.cuisine ?? s?.country ?? "").trim();
          const qty = Number(s?.qty) || 0;
          return cuisine && qty > 0 ? `${cuisine}×${qty}` : "";
        })
        .filter(Boolean)
        .join("; ");
      const meals = countMeals(selections);
      return {
        name: inv.guest_name ?? "",
        phone: inv.guest_phone ?? "",
        email: inv.guest_email ?? "",
        audience: inv.is_committee ? "Committee" : "Guest",
        sms_sent: inv.invite_sent_at ? "yes" : "no",
        rsvp_status: r?.status ?? "pending",
        party_size: r?.party_size ?? "",
        attendance_mode: r?.attendance_mode ?? "",
        ordering_food: r?.ordering_food === true ? "yes" : r?.ordering_food === false ? "no" : "",
        responded_at: r?.responded_at ?? "",
        preorder_selections: selectionText,
        preorder_meals: meals,
      };
    });

    return { rows };
  });
