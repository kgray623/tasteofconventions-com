import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export type AudienceTotals = {
  guests_uploaded: number;
  sms_sent: number;
  confirmed_in_person_people: number;
  confirmed_zoom_people: number;
  confirmed_total_people: number;
  declined_people: number;
  maybe_people: number;
  waitlist_people: number;
  pending_people: number;
  rsvp_records: number;
  food_order_records_all: number;
  food_order_records_linked: number;
  food_order_records_unlinked: number;
  meals_ordered_all: number;
  meals_ordered_linked: number;
  meals_ordered_unlinked: number;
};

const emptyTotals = (): AudienceTotals => ({
  guests_uploaded: 0,
  sms_sent: 0,
  confirmed_in_person_people: 0,
  confirmed_zoom_people: 0,
  confirmed_total_people: 0,
  declined_people: 0,
  maybe_people: 0,
  waitlist_people: 0,
  pending_people: 0,
  rsvp_records: 0,
  food_order_records_all: 0,
  food_order_records_linked: 0,
  food_order_records_unlinked: 0,
  meals_ordered_all: 0,
  meals_ordered_linked: 0,
  meals_ordered_unlinked: 0,
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

    const invIds = new Set(invs.map((i) => i.id));

    const totals = emptyTotals();
    totals.guests_uploaded = invs.length;
    totals.sms_sent = invs.filter((i) => !!i.invite_sent_at).length;
    totals.rsvp_records = rsvps.length;

    // Count people from RSVPs directly (party_size aware).
    // Only count RSVPs attached to a real invitation toward people totals.
    const dupSeen = new Set<string>();
    const dupInvitationIds: string[] = [];
    for (const r of rsvps) {
      if (!invIds.has(r.invitation_id)) continue;
      if (dupSeen.has(r.invitation_id)) {
        dupInvitationIds.push(r.invitation_id);
        // still count people? No — only count first response per invitation
        continue;
      }
      dupSeen.add(r.invitation_id);

      const party = r.party_size ?? 1;
      const status = r.status;
      const mode = r.attendance_mode;
      if (status === "yes") {
        totals.confirmed_total_people += party;
        if (mode === "zoom") totals.confirmed_zoom_people += party;
        else totals.confirmed_in_person_people += party;
      } else if (status === "no") {
        totals.declined_people += party;
      } else if (status === "maybe") {
        totals.maybe_people += party;
      } else if (status === "waitlist") {
        totals.waitlist_people += party;
      }
    }

    totals.pending_people = Math.max(
      0,
      totals.guests_uploaded
        - totals.confirmed_total_people
        - totals.declined_people
        - totals.maybe_people
        - totals.waitlist_people,
    );

    // Food orders
    for (const p of preorders) {
      const meals = countMeals(p.selections);
      const linked = !!p.invitation_id && invIds.has(p.invitation_id);
      totals.food_order_records_all += 1;
      totals.meals_ordered_all += meals;
      if (linked) {
        totals.food_order_records_linked += 1;
        totals.meals_ordered_linked += meals;
      } else {
        totals.food_order_records_unlinked += 1;
        totals.meals_ordered_unlinked += meals;
      }
    }

    const orphanRsvps = rsvps.filter((r) => !invIds.has(r.invitation_id)).length;
    const unlinkedPreorders = preorders
      .filter((p) => !p.invitation_id || !invIds.has(p.invitation_id))
      .map((p) => ({
        id: p.id,
        name: p.name ?? "",
        phone: p.phone ?? "",
        meals: countMeals(p.selections),
      }));

    return {
      all: totals,
      reconciliation: {
        invitations_total: invs.length,
        rsvp_records: rsvps.length,
        duplicate_rsvp_invitations: dupInvitationIds.length,
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
    for (const r of (rsvpRes.data ?? []) as any[]) {
      if (!rsvpByInv.has(r.invitation_id)) rsvpByInv.set(r.invitation_id, r);
    }
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
