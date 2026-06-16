import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export type CuisineKey = "Myanmar" | "African" | "Indonesian" | "Other";

export type AudienceTotals = {
  guests_uploaded: number;
  sms_sent: number;
  confirmed_in_person: number;
  confirmed_zoom: number;
  confirmed_total: number;
  declined: number;
  maybe: number;
  waitlist: number;
  pending: number;
  rsvp_records: number;
  preorder_rows: number;
  meals_total: number;
  meals_by_cuisine: Record<string, number>;
  unlinked_preorders: number;
};

const emptyTotals = (): AudienceTotals => ({
  guests_uploaded: 0,
  sms_sent: 0,
  confirmed_in_person: 0,
  confirmed_zoom: 0,
  confirmed_total: 0,
  declined: 0,
  maybe: 0,
  waitlist: 0,
  pending: 0,
  rsvp_records: 0,
  preorder_rows: 0,
  meals_total: 0,
  meals_by_cuisine: {},
  unlinked_preorders: 0,
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

function normalizeCuisine(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("myanmar") || lower.includes("burmese")) return "Myanmar";
  if (lower.includes("african") || lower.includes("mozambique")) return "African";
  if (lower.includes("indonesia") || lower.includes("jakarta")) return "Indonesian";
  return raw.trim() || "Other";
}

function parseSelections(selections: unknown): { cuisine: string; qty: number }[] {
  if (!Array.isArray(selections)) return [];
  const out: { cuisine: string; qty: number }[] = [];
  for (const item of selections) {
    if (!item || typeof item !== "object") continue;
    const raw = String(
      (item as any).cuisine ?? (item as any).country ?? "",
    );
    const qty = Number((item as any).qty ?? (item as any).quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    out.push({ cuisine: normalizeCuisine(raw), qty: Math.round(qty) });
  }
  return out;
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

    const dupSeen = new Set<string>();
    const dupInvitationIds: string[] = [];
    for (const r of rsvps) {
      if (!invIds.has(r.invitation_id)) continue;
      if (dupSeen.has(r.invitation_id)) {
        dupInvitationIds.push(r.invitation_id);
        continue;
      }
      dupSeen.add(r.invitation_id);

      const party = r.party_size ?? 1;
      const status = r.status;
      const mode = r.attendance_mode;
      if (status === "yes") {
        totals.confirmed_total += party;
        if (mode === "zoom") totals.confirmed_zoom += party;
        else totals.confirmed_in_person += party;
      } else if (status === "no") {
        totals.declined += party;
      } else if (status === "maybe") {
        totals.maybe += party;
      } else if (status === "waitlist") {
        totals.waitlist += party;
      }
    }

    totals.pending = Math.max(
      0,
      totals.guests_uploaded
        - totals.confirmed_total
        - totals.declined
        - totals.maybe
        - totals.waitlist,
    );

    // Food orders: count meals (quantities), not rows.
    totals.preorder_rows = preorders.length;
    const byCuisine: Record<string, number> = {};
    for (const p of preorders) {
      const sels = parseSelections(p.selections);
      for (const s of sels) {
        totals.meals_total += s.qty;
        byCuisine[s.cuisine] = (byCuisine[s.cuisine] ?? 0) + s.qty;
      }
      if (!p.invitation_id || !invIds.has(p.invitation_id)) {
        totals.unlinked_preorders += 1;
      }
    }
    totals.meals_by_cuisine = byCuisine;

    const orphanRsvps = rsvps.filter((r) => !invIds.has(r.invitation_id)).length;
    const unlinkedPreorders = preorders
      .filter((p) => !p.invitation_id || !invIds.has(p.invitation_id))
      .map((p) => {
        const sels = parseSelections(p.selections);
        const meals = sels.reduce((a, b) => a + b.qty, 0);
        return { id: p.id, name: p.name ?? "", phone: p.phone ?? "", meals };
      });

    // Collapse duplicate flags to unique pairs.
    const { data: dupRows } = await supabaseAdmin
      .from("duplicate_flags")
      .select("invitation_a,invitation_b");
    const dupPairs = new Set<string>();
    for (const d of (dupRows ?? []) as { invitation_a: string; invitation_b: string }[]) {
      const a = d.invitation_a < d.invitation_b ? d.invitation_a : d.invitation_b;
      const b = d.invitation_a < d.invitation_b ? d.invitation_b : d.invitation_a;
      dupPairs.add(`${a}|${b}`);
    }

    return {
      all: totals,
      reconciliation: {
        invitations_total: invs.length,
        duplicate_rsvp_invitations: dupInvitationIds.length,
        orphan_rsvps: orphanRsvps,
        duplicate_guest_pairs: dupPairs.size,
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
      const sels = parseSelections(p?.selections);
      const selectionText = sels.map((s) => `${s.cuisine}×${s.qty}`).join("; ");
      const meals = sels.reduce((a, b) => a + b.qty, 0);
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
