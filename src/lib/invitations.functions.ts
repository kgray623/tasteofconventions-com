import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSingleExtraDigitPhoneVariant } from "@/lib/phone";

function publicDbError(
  error: { message?: string } | null | undefined,
  fallback = "Something went wrong. Please try again.",
): Error {
  if (error?.message)
    console.error("[invitations] db error:", error.message, new Error("trace").stack);
  return new Error(fallback);
}

type PreorderRecord = {
  id?: string;
  invitation_id?: string | null;
  phone?: string | null;
  selections?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
};

function phoneCandidates(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return [];
  return Array.from(
    new Set([
      digits,
      digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits,
      digits.length === 10 ? `1${digits}` : digits,
    ]),
  );
}

function normalizeCuisineName(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("myanmar") || lower.includes("burmese")) return "Myanmar";
  if (lower.includes("african") || lower.includes("africa") || lower.includes("mozambique"))
    return "African";
  if (lower.includes("indonesia")) return "Indonesian";
  return value.trim();
}

function normalizePreorder(row: PreorderRecord | null) {
  if (!row) return null;
  const selections = Array.isArray(row.selections)
    ? row.selections.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const rawCuisine = "cuisine" in item ? item.cuisine : "country" in item ? item.country : "";
        const rawQty = "qty" in item ? Number(item.qty) : 0;
        const qty = Number.isFinite(rawQty) ? Math.max(0, Math.round(rawQty)) : 0;
        const cuisine = normalizeCuisineName(String(rawCuisine ?? ""));
        return qty > 0 && cuisine ? [{ cuisine, qty }] : [];
      })
    : [];
  return { id: row.id as string | undefined, selections, updated_at: row.updated_at ?? null };
}

async function findCuisinePreorder(invitationId: string, phone?: string | null) {
  const { data: byInvitation, error: invitationErr } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("id,invitation_id,phone,selections,updated_at,created_at")
    .eq("invitation_id", invitationId)
    .maybeSingle();
  if (invitationErr) throw publicDbError(invitationErr);
  if (byInvitation) return normalizePreorder(byInvitation as PreorderRecord);

  const candidates = new Set(phoneCandidates(phone ?? ""));
  if (candidates.size === 0) return null;

  const { data: preorders, error } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("id,invitation_id,phone,selections,updated_at,created_at")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw publicDbError(error);

  const match = ((preorders ?? []) as PreorderRecord[]).find((row) => {
    if (row.invitation_id && row.invitation_id !== invitationId) return false;
    const rowDigits = row.phone?.replace(/\D/g, "") ?? "";
    return phoneCandidates(rowDigits).some((candidate) => candidates.has(candidate));
  });

  if (match?.id && !match.invitation_id) {
    await supabaseAdmin
      .from("cuisine_preorders")
      .update({ invitation_id: invitationId })
      .eq("id", match.id)
      .is("invitation_id", null);
  }

  return normalizePreorder(match ?? null);
}

async function loadCanonicalMealPaymentRows(preorderId: string) {
  const { loadMealCommunicationLedger } = await import("@/lib/meal-communication.server");
  const ledger = await loadMealCommunicationLedger(supabaseAdmin);
  const rows = ledger.rows.filter((row) => row.id === preorderId);
  return {
    mealPayments: rows
      .filter((row) => row.qty_paid > 0 && row.paid_source)
      .map((row) => ({
        cuisine: row.cuisine,
        qty: row.qty,
        qty_paid: row.qty_paid,
        paid_at: row.paid_at,
        source: row.paid_source,
        method: row.paid_method,
        state: row.state,
        confirmed_at: row.verified_at,
      })),
    mealStatuses: rows
      .filter((row) => row.state === "paid_confirmed")
      .map((row) => ({ cuisine: row.cuisine, confirmed: true, confirmed_at: row.verified_at })),
  };
}

// Lookup the currently signed-in guest's most recent invitation (by phone number).
export const getMyInvitation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).userId as string | undefined;
    if (!userId) return { invitation: null, rsvp: null, order: null };

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const rawPhone = authUser?.user?.phone || (authUser?.user?.user_metadata as any)?.phone || "";
    const phoneNorm = String(rawPhone).replace(/[^0-9]/g, "");
    if (!phoneNorm || phoneNorm.length < 7) return { invitation: null, rsvp: null, order: null };

    // guest_phone_normalized is a generated column that strips non-digits from
    // whatever was typed, so the same US number can be stored as "8082787562"
    // (10) or "18082787562" (11). Match both.
    const candidates = phoneCandidates(phoneNorm);

    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select(
        "id,event_id,guest_name,guest_phone,rsvp_token,created_at,events(title,description,starts_at,ends_at,location,virtual_link)",
      )
      .in("guest_phone_normalized", candidates)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw publicDbError(error);
    if (!inv) return { invitation: null, rsvp: null, order: null };
    const [{ data: rsvp }, { data: order }, preorder] = await Promise.all([
      supabaseAdmin.from("rsvps").select("*").eq("invitation_id", inv.id).maybeSingle(),
      supabaseAdmin.from("orders").select("*").eq("invitation_id", inv.id).maybeSingle(),
      findCuisinePreorder(inv.id, inv.guest_phone ?? rawPhone),
    ]);
    let mealPayments: Array<{
      cuisine: string;
      qty: number;
      qty_paid: number;
      paid_at: string | null;
      source: string | null;
      method: string | null;
    }> = [];
    let mealStatuses: Array<{ cuisine: string; confirmed: boolean; confirmed_at: string | null }> = [];
    if (preorder?.id) ({ mealPayments, mealStatuses } = await loadCanonicalMealPaymentRows(preorder.id));
    return { invitation: inv, rsvp, order, preorder, mealPayments, mealStatuses };
  });

const BUILDING_IN_PERSON_CAPACITY = 550;

// Determine if a "yes" RSVP should be placed on the waiting list because
// the building's in-person attendance cap is full. Inviter/member quotas do
// not create a waitlist; they are only committee allocation/admin numbers.
async function shouldWaitlist(
  invitationId: string,
  partySize: number,
  attendanceMode: string,
): Promise<boolean> {
  if (attendanceMode === "zoom") return false;

  const { data: inv, error: invitationError } = await supabaseAdmin
    .from("invitations")
    .select("event_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (invitationError) throw publicDbError(invitationError);

  const eventId = (inv as { event_id?: string | null } | null)?.event_id;
  if (!eventId) return false;

  // Join through invitations instead of sending every invitation id in the URL:
  // with hundreds of invitations the id list produced a request URL large enough
  // to make the fetch fail outright, which aborted the whole RSVP submission.
  const { data: yesRsvps, error: rsvpsError } = await supabaseAdmin
    .from("rsvps")
    .select("invitation_id,party_size,attendance_mode,invitations!inner(event_id)")
    .eq("invitations.event_id", eventId)
    .eq("status", "yes");
  if (rsvpsError) throw publicDbError(rsvpsError);

  const confirmedInPerson = (
    (yesRsvps ?? []) as Array<{
      invitation_id?: string | null;
      party_size?: number | null;
      attendance_mode?: string | null;
    }>
  )
    .filter((row) => row.attendance_mode !== "zoom" && row.invitation_id !== invitationId)
    .reduce((sum, row) => sum + (row.party_size ?? 1), 0);


  return confirmedInPerson + partySize > BUILDING_IN_PERSON_CAPACITY;
}

function rsvpTokenCandidates(token: string) {
  const trimmed = token.trim();
  return Array.from(
    new Set(
      [trimmed, trimmed.replace(/ /g, "+"), trimmed.replace(/-/g, "+").replace(/_/g, "/")].filter(
        Boolean,
      ),
    ),
  );
}

// Public lookup of an invitation by RSVP token (used on the guest magic-link page)
export const getInvitationByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(8).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select(
        "id,event_id,guest_name,guest_phone,invite_sent_at,events(title,description,starts_at,ends_at,location,virtual_link)",
      )
      .in("rsvp_token", rsvpTokenCandidates(data.token))
      .maybeSingle();
    if (error) throw publicDbError(error);
    if (!inv) return { invitation: null, rsvp: null, order: null, expired: false };
    const [{ data: rsvp }, { data: order }, preorder] = await Promise.all([
      supabaseAdmin.from("rsvps").select("*").eq("invitation_id", inv.id).maybeSingle(),
      supabaseAdmin.from("orders").select("*").eq("invitation_id", inv.id).maybeSingle(),
      findCuisinePreorder(inv.id, inv.guest_phone),
    ]);
    let mealPayments: Array<{
      cuisine: string;
      qty: number;
      qty_paid: number;
      paid_at: string | null;
      source: string | null;
      method: string | null;
    }> = [];
    let mealStatuses: Array<{ cuisine: string; confirmed: boolean; confirmed_at: string | null }> = [];
    if (preorder?.id) ({ mealPayments, mealStatuses } = await loadCanonicalMealPaymentRows(preorder.id));
    return { invitation: inv, rsvp, order, preorder, mealPayments, mealStatuses, expired: false };
  });

const RsvpInput = z.object({
  token: z.string().min(8).max(120),
  guest_name: z.string().min(1).max(120).optional(),
  guest_phone: z.string().min(7).max(40).optional(),
  status: z.enum(["yes", "no", "maybe"]),
  party_size: z.number().int().min(1).max(20),
  attendance_mode: z.enum(["in_person", "zoom"]).optional(),
  ordering_food: z.boolean().optional().nullable(),
  dietary_notes: z.string().max(500).optional().nullable(),
  invited_by: z.string().max(200).optional().nullable(),
});

export const submitRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) => RsvpInput.parse(d))
  .handler(async ({ data }) => {
    try {
      return await submitRsvpInner(data);
    } catch (err) {
      await logRsvpEvent(
        "RSVP SUBMIT FAILED",
        {
          source: "token",
          invited_by_raw: data.invited_by ?? null,
          status: data.status,
          party_size: data.party_size,
          attendance_mode: data.attendance_mode ?? null,
          reason: err instanceof Error ? err.message : String(err),
        },
        false,
      );
      throw err;
    }
  });

async function submitRsvpInner(data: z.infer<typeof RsvpInput>) {
  const invitedBy = await resolveInvitedBy(data.invited_by);
  const { data: inv } = await supabaseAdmin
    .from("invitations")
    .select("id")
    .in("rsvp_token", rsvpTokenCandidates(data.token))
    .maybeSingle();
  if (!inv) throw new Error("Invitation not found");

  if (data.guest_name || data.guest_phone) {
    const { error: invitationError } = await supabaseAdmin
      .from("invitations")
      .update({
        ...(data.guest_name ? { guest_name: data.guest_name.trim() } : {}),
        ...(data.guest_phone ? { guest_phone: data.guest_phone.trim() } : {}),
      })
      .eq("id", inv.id);
    if (invitationError) throw publicDbError(invitationError);
  }
  const { data: existingRsvp } = await supabaseAdmin
    .from("rsvps")
    .select("status")
    .eq("invitation_id", inv.id)
    .maybeSingle();
  void existingRsvp;
  const mode = data.attendance_mode ?? "in_person";
  const effectivePartySize = mode === "zoom" ? 1 : data.party_size;
  const orderingFood = mode === "in_person" ? (data.ordering_food ?? null) : null;
  let finalStatus: "yes" | "no" | "maybe" | "waitlist" = data.status;
  let waitlisted = false;
  if (data.status === "yes" && (await shouldWaitlist(inv.id, effectivePartySize, mode))) {
    finalStatus = "waitlist";
    waitlisted = true;
  }
  const { error } = await supabaseAdmin.from("rsvps").upsert(
    {
      invitation_id: inv.id,
      status: finalStatus,
      party_size: effectivePartySize,
      attendance_mode: mode,
      ordering_food: orderingFood,
      dietary_notes: data.dietary_notes ?? null,
      message: null,
      invited_by: invitedBy.text,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "invitation_id" },
  );
  if (error) throw publicDbError(error);
  if (invitedBy.needsReview) {
    await logRsvpEvent(
      "RSVP REFERRER NEEDS REVIEW",
      { source: "token", invited_by_raw: invitedBy.text, invitation_id: inv.id },
      true,
      inv.id,
    );
  }
  return { ok: true, waitlisted, referrerNeedsReview: invitedBy.needsReview };
}

const OrderInput = z.object({
  token: z.string().min(8).max(120),
  restaurant_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        name: z.string().max(200).optional(),
        price: z.number().optional(), // ignored server-side; authoritative price is loaded from DB
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
  notes: z.string().max(500).optional().nullable(),
});

const CuisinePreorderInput = z.object({
  token: z.string().min(8).max(120),
  selections: z
    .array(
      z.object({
        cuisine: z.string().min(1).max(80),
        qty: z.number().int().min(0).max(50),
      }),
    )
    .max(10),
  // Cuisines the person explicitly confirmed they want lowered or removed.
  // Without this, a save can never reduce or erase a meal already on record.
  confirmed_removals: z.array(z.string().min(1).max(80)).max(10).optional(),
});

const StandaloneCuisinePreorderInput = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(7).max(40),
  selections: z
    .array(
      z.object({
        cuisine: z.string().min(1).max(80),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(10),
});

// Expected, normal state after the pre-order cutoff — not a technical error.
export const MEAL_PREORDER_CLOSED_MESSAGE =
  "Meal preordering has closed. You're welcome to pay for a meal at the event, or bring a covered dish.";

function isPreordersClosed(error: { message?: string } | null | undefined): boolean {
  return (error?.message ?? "").includes("PREORDERS_CLOSED");
}

function mealWriteError(error: { message?: string } | null): Error {
  const message = error?.message ?? "";
  if (isPreordersClosed(error)) {
    return new Error(MEAL_PREORDER_CLOSED_MESSAGE);
  }
  if (message.includes("MEAL_REMOVAL_NOT_CONFIRMED")) {
    const cuisine = message.split("MEAL_REMOVAL_NOT_CONFIRMED:")[1]?.trim() || "that";
    return new Error(
      `To lower or remove your ${cuisine} meals, please confirm the removal first. Nothing was changed.`,
    );
  }
  if (message.includes("MEAL_REDUCTION_NOT_CONFIRMED")) {
    return new Error("Meals can only be removed with a confirmed removal. Nothing was changed.");
  }
  return publicDbError(error as any);
}

export const submitCuisinePreorder = createServerFn({ method: "POST" })
  .inputValidator((d) => CuisinePreorderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone")
      .in("rsvp_token", rsvpTokenCandidates(data.token))
      .maybeSingle();
    if (!inv) throw new Error("Invitation not found");

    // Merge-safe: the record is never deleted and cuisines that were not
    // submitted are left exactly as they are. Reductions/removals only apply
    // when explicitly confirmed; everything is kept in the audit ledger.
    const { data: merged, error } = await supabaseAdmin.rpc("save_meal_order" as any, {
      _invitation_id: inv.id,
      _name: inv.guest_name.slice(0, 120),
      _phone: (inv.guest_phone ?? "").slice(0, 40) || "—",
      _submitted: data.selections,
      _confirmed_removals: data.confirmed_removals ?? [],
      _mode: "strict",
    });
    if (error) throw mealWriteError(error);

    const selections = (merged ?? []) as Array<{ cuisine: string; qty: number }>;

    // A guest cancelling their own meal is the only thing that retires a
    // payment record — and even then the record is kept and flagged, never
    // deleted, so the money history stays intact.
    const removed = (data.confirmed_removals ?? []).filter(
      (cuisine) => !selections.some((s) => s.cuisine === cuisine && s.qty > 0),
    );
    if (removed.length > 0) {
      const { data: preorder } = await supabaseAdmin
        .from("cuisine_preorders")
        .select("id")
        .eq("invitation_id", inv.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (preorder?.id) {
        await supabaseAdmin
          .from("meal_payments")
          .update({
            cancelled_meal_at: new Date().toISOString(),
            cancelled_note: "Guest cancelled this meal from their own RSVP",
            updated_at: new Date().toISOString(),
          })
          .eq("preorder_id", preorder.id)
          .in("cuisine", removed)
          .is("cancelled_meal_at", null);
      }
    }

    return { ok: true, selections, cancelled: selections.length === 0 };

  });

export const submitStandaloneCuisinePreorder = createServerFn({ method: "POST" })
  .inputValidator((d) => StandaloneCuisinePreorderInput.parse(d))
  .handler(async ({ data }) => {
    const phoneNorm = data.phone.replace(/\D/g, "");
    if (phoneNorm.length < 7) throw new Error("Enter the mobile number used for your RSVP.");

    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("id")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!ev) throw new Error("No event configured yet");

    const candidates = phoneCandidates(phoneNorm);
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone")
      .eq("event_id", ev.id)
      .in("guest_phone_normalized", candidates)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (invErr) throw publicDbError(invErr);
    if (!invitation)
      throw new Error("Please RSVP first using the same mobile number before choosing meals.");

    const { data: rsvp, error: rsvpErr } = await supabaseAdmin
      .from("rsvps")
      .select("status")
      .eq("invitation_id", invitation.id)
      .maybeSingle();
    if (rsvpErr) throw publicDbError(rsvpErr);
    if (rsvp?.status !== "yes") {
      throw new Error("Meal choices are only saved after an attending RSVP is on file.");
    }

    // Additive: this public form can only add or raise meals, never lose one.
    const { error } = await supabaseAdmin.rpc("save_meal_order" as any, {
      _invitation_id: invitation.id,
      _name: (invitation.guest_name || data.name).slice(0, 120),
      _phone: (invitation.guest_phone || data.phone).slice(0, 40),
      _submitted: data.selections,
      _confirmed_removals: [],
      _mode: "additive",
    });
    if (error) throw mealWriteError(error);

    return { ok: true };
  });


export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => OrderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations")
      .select("id")
      .in("rsvp_token", rsvpTokenCandidates(data.token))
      .maybeSingle();
    if (!inv) throw new Error("Invitation not found");

    // Authoritative pricing: load menu items from DB. NEVER trust client-supplied price.
    const ids = Array.from(new Set(data.items.map((i) => i.menu_item_id)));
    const { data: menuItems, error: menuErr } = await supabaseAdmin
      .from("menu_items")
      .select("id,name,price,restaurant_id,available")
      .in("id", ids);
    if (menuErr) throw publicDbError(menuErr);
    const byId = new Map((menuItems ?? []).map((m) => [m.id, m]));
    if (byId.size !== ids.length) throw new Error("Unknown menu item");

    const verifiedItems = data.items.map((i) => {
      const m = byId.get(i.menu_item_id)!;
      if (m.restaurant_id !== data.restaurant_id)
        throw new Error("Item not in selected restaurant");
      if (m.available === false) throw new Error("Item not available");
      return { menu_item_id: m.id, name: m.name, price: Number(m.price), quantity: i.quantity };
    });
    const total = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const { error } = await supabaseAdmin.from("orders").upsert(
      {
        invitation_id: inv.id,
        restaurant_id: data.restaurant_id,
        items: verifiedItems,
        total,
        notes: data.notes ?? null,
      },
      { onConflict: "invitation_id" },
    );
    if (error) throw publicDbError(error);
    return { ok: true, total };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Committee roster (names only) — public, used by RSVP "Invited by" picker
// ─────────────────────────────────────────────────────────────────────────────

// Roster of everyone who can appear in the RSVP "Invited by" picker:
// committee members AND confirmed/waitlisted guests. Names only — no phone/email
// exposed. Public (unauthenticated) because the RSVP form is public.
export const getCommitteeRoster = createServerFn({ method: "GET" }).handler(async () => {
  const [invitersRes, invitationsRes, teamRes] = await Promise.all([
    supabaseAdmin.from("inviters").select("id,name").eq("active", true),
    supabaseAdmin.from("invitations").select("id,guest_name,is_committee,rsvps(status)"),
    supabaseAdmin.from("team_invites").select("id,name").eq("role", "team"),
  ]);

  type Row = { id: string; name: string; kind: "committee" | "guest" };
  const rows: Row[] = [];
  for (const r of invitersRes.data ?? []) {
    const name = (r.name ?? "").trim();
    if (name) rows.push({ id: r.id, name, kind: "committee" });
  }
  for (const r of invitationsRes.data ?? []) {
    const name = (r.guest_name ?? "").trim();
    const statuses = Array.isArray(r.rsvps) ? r.rsvps.map((row) => row.status) : [];
    const isEligibleGuest = statuses.some((status) => status === "yes" || status === "waitlist");
    if (name && (r.is_committee || isEligibleGuest)) {
      rows.push({ id: r.id, name, kind: r.is_committee ? "committee" : "guest" });
    }
  }
  for (const r of teamRes.data ?? []) {
    const name = (r.name ?? "").trim();
    if (name) rows.push({ id: r.id, name, kind: "committee" });
  }

  // Dedupe by lowercased name; committee wins the kind tag on tie.
  const byKey = new Map<string, Row>();
  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    const key = r.name.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || (existing.kind === "guest" && r.kind === "committee")) {
      byKey.set(key, r);
    }
  }
  return { members: Array.from(byKey.values()) };
});

export type InvitedByResolution = {
  /** Text stored verbatim on the RSVP row — never discarded. */
  text: string;
  /** Committee member the text resolved to, when confident. */
  inviterId: string | null;
  /** True when we could not confidently match; the RSVP is still saved and flagged. */
  needsReview: boolean;
};

/**
 * Resolve the "invited by" text a guest typed.
 *
 * IMPORTANT: this must never throw for an unrecognized name. A guest's reply is
 * never thrown away because they typed "Tina" instead of "Tina Santana" — we
 * fuzzy-resolve first, and if that fails we still save the RSVP and flag it for
 * admin review (see logRsvpReferrerReview / listRsvpIssues).
 */
async function resolveInvitedBy(rawName: string | null | undefined): Promise<InvitedByResolution> {
  const name = (rawName ?? "").trim();
  if (!name || name === "__other__") {
    throw new Error("Please tell us who invited you.");
  }

  // 1) Exact roster match (fast path, unchanged behaviour for good input).
  const [invitersRes, invitationsRes, teamRes] = await Promise.all([
    supabaseAdmin.from("inviters").select("id,name").eq("active", true),
    supabaseAdmin.from("invitations").select("guest_name,is_committee,rsvps(status)"),
    supabaseAdmin.from("team_invites").select("name").eq("role", "team"),
  ]);

  const norm = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .replace(/^(sister|sis|sr|brother|bro|br|elder|pastor|pr|dr|mr|mrs|ms)\.?\s+/i, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const roster = new Map<string, string | null>();
  for (const r of invitersRes.data ?? []) if (r.name) roster.set(norm(r.name), r.id);
  for (const r of invitationsRes.data ?? []) {
    const statuses = Array.isArray(r.rsvps) ? r.rsvps.map((row) => row.status) : [];
    const isEligibleGuest = statuses.some((status) => status === "yes" || status === "waitlist");
    if (r.guest_name && (r.is_committee || isEligibleGuest)) {
      if (!roster.has(norm(r.guest_name))) roster.set(norm(r.guest_name), null);
    }
  }
  for (const r of teamRes.data ?? [])
    if (r.name && !roster.has(norm(r.name))) roster.set(norm(r.name), null);

  const target = norm(name);
  if (roster.has(target)) {
    const exactId = roster.get(target) ?? null;
    if (exactId) return { text: name, inviterId: exactId, needsReview: false };
  }

  // 2) Fuzzy / partial resolution through the shared referral resolver.
  const { data: resolvedId } = await supabaseAdmin.rpc("resolve_referral_inviter_id" as any, {
    _raw_name: name,
  });
  if (typeof resolvedId === "string" && resolvedId) {
    return { text: name, inviterId: resolvedId, needsReview: false };
  }

  // 3) First-name-only / unique-prefix match against the committee roster.
  const rosterEntries = [...roster.entries()].filter(([, id]) => !!id) as [string, string][];
  const candidates = rosterEntries.filter(
    ([key]) => key === target || key.startsWith(`${target} `) || key.split(" ").includes(target),
  );
  const uniqueIds = new Set(candidates.map(([, id]) => id));
  if (uniqueIds.size === 1) {
    return { text: name, inviterId: [...uniqueIds][0], needsReview: false };
  }

  // 4) Could not resolve — keep the guest's text, save the RSVP, flag for review.
  if (roster.has(target)) return { text: name, inviterId: null, needsReview: false };
  return { text: name, inviterId: null, needsReview: true };
}

/** Records a rejected/flagged RSVP so no reply is ever silently lost. */
async function logRsvpEvent(
  action: string,
  metadata: Record<string, unknown>,
  success: boolean,
  targetId?: string | null,
) {
  try {
    await supabaseAdmin.from("audit_log").insert({
      action,
      target_type: "rsvps",
      target_id: targetId ?? null,
      metadata: metadata as any,
      success,
    });
  } catch (err) {
    console.error("[invitations] failed to log rsvp event", err);
  }
}

const PublicRsvpInput = z.object({
  guest_name: z.string().min(1).max(120),
  guest_phone: z.string().max(40).optional().nullable(),
  password: z.string().min(6).max(72).optional().nullable(),
  status: z.enum(["yes", "no"]),
  party_size: z.number().int().min(1).max(20),
  attendance_mode: z.enum(["in_person", "zoom"]).optional(),
  ordering_food: z.boolean().optional().nullable(),
  invited_by: z.string().max(200).optional().nullable(),
  cuisine_selections: z
    .array(
      z.object({
        cuisine: z.string().min(1).max(80),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .max(10)
    .optional()
    .nullable(),
});

function normalizeAuthPhone(value: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return "";
}

export const submitPublicRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) => PublicRsvpInput.parse(d))
  .handler(async ({ data }) => {
    try {
      return await submitPublicRsvpInner(data);
    } catch (err) {
      await logRsvpEvent(
        "RSVP SUBMIT FAILED",
        {
          source: "public",
          guest_name: data.guest_name,
          guest_phone: data.guest_phone ?? null,
          invited_by_raw: data.invited_by ?? null,
          status: data.status,
          party_size: data.party_size,
          attendance_mode: data.attendance_mode ?? null,
          reason: err instanceof Error ? err.message : String(err),
        },
        false,
      );
      throw err;
    }
  });

async function submitPublicRsvpInner(data: z.infer<typeof PublicRsvpInput>) {
  const invitedBy = await resolveInvitedBy(data.invited_by);

  // Find an event to attach to
  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id")
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ev) throw new Error("No event configured yet");
  // Find a host (first profile / admin)
  const { data: host } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!host) throw new Error("No host configured yet");

  const phone = data.guest_phone?.trim() || null;
  const password = data.password?.trim() || null;
  const selections = (data.cuisine_selections ?? []).filter((s) => s.qty > 0);
  const authPhone = normalizeAuthPhone(phone);

  if (selections.length > 0 && !phone) {
    throw new Error("A mobile number is required before meal choices can be saved.");
  }

  if (authPhone && password) {
    const { data: createdUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
      phone: authPhone,
      password,
      phone_confirm: true,
      user_metadata: { display_name: data.guest_name, phone },
    });

    if (createUserErr && !/already|registered|exists/i.test(createUserErr.message)) {
      throw publicDbError(createUserErr);
    }

    // SECURITY: Only seed profile for newly created users. NEVER call
    // updateUserById here — that would let an anonymous RSVP submission
    // overwrite the password of any existing account (account takeover).
    // If the phone is already registered, silently skip account setup;
    // the user can sign in with their existing credentials.
    const userId = createdUser?.user?.id ?? null;
    if (userId) {
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        display_name: data.guest_name,
      });
    }
  }

  // Reuse an existing invitation when the submitted phone is an exact match.
  // If someone accidentally typed one extra digit, link only when there is
  // exactly one same-referrer record with the same first name. Ambiguous near
  // matches remain separate and are logged for review; submitted data is never
  // discarded or silently moved between committee members.
  let invitationId: string | null = null;
  if (phone) {
    const phoneNorm = phone.replace(/\D/g, "");
    if (phoneNorm.length >= 7) {
      const { data: exactRows, error: exactError } = await supabaseAdmin
        .from("invitations")
        .select("id")
        .eq("event_id", ev.id)
        .in("guest_phone_normalized", phoneCandidates(phoneNorm))
        .limit(2);
      if (exactError) throw publicDbError(exactError);
      if (exactRows?.length === 1) invitationId = exactRows[0].id;

      if (!invitationId && invitedBy.inviterId) {
        const submittedFirstName = data.guest_name.trim().toLowerCase().split(/\s+/)[0] ?? "";
        const { data: ownerRows, error: ownerRowsError } = await supabaseAdmin
          .from("invitations")
          .select("id,guest_name,guest_phone")
          .eq("event_id", ev.id)
          .eq("inviter_id", invitedBy.inviterId)
          .not("guest_phone", "is", null)
          .limit(500);
        if (ownerRowsError) throw publicDbError(ownerRowsError);
        const nearMatches = (ownerRows ?? []).filter((row) => {
          const existingFirstName =
            (row.guest_name ?? "").trim().toLowerCase().split(/\s+/)[0] ?? "";
          return (
            submittedFirstName.length >= 2 &&
            submittedFirstName === existingFirstName &&
            isSingleExtraDigitPhoneVariant(phoneNorm, row.guest_phone)
          );
        });
        if (nearMatches.length === 1) {
          invitationId = nearMatches[0].id;
          await logRsvpEvent(
            "RSVP LINKED PHONE TYPO",
            {
              source: "public",
              guest_name_submitted: data.guest_name,
              guest_phone_submitted: phone,
              matched_guest_name: nearMatches[0].guest_name,
              invitation_id: invitationId,
            },
            true,
            invitationId,
          );
        } else if (nearMatches.length > 1) {
          await logRsvpEvent(
            "RSVP PHONE TYPO NEEDS REVIEW",
            {
              source: "public",
              guest_name: data.guest_name,
              guest_phone: phone,
              candidate_invitation_ids: nearMatches.map((row) => row.id),
            },
            true,
          );
        }
      }
    }
  }

  let isNewInvitation = false;
  if (!invitationId) {
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("invitations")
      .insert({
        event_id: ev.id,
        host_id: host.id,
        guest_name: data.guest_name,
        guest_phone: phone,
        // Store the resolved First-Loaded referral owner at creation time.
        // The database trigger aligns host_id to this inviter's linked account
        // when one exists; unresolved text is retained on the RSVP for review.
        inviter_id: invitedBy.inviterId,
      })
      .select("id")
      .single();
    if (invErr) throw publicDbError(invErr);
    invitationId = inv.id;
    isNewInvitation = true;
  }

  const mode = data.attendance_mode ?? "in_person";
  const effectivePartySize = mode === "zoom" ? 1 : data.party_size;
  const orderingFood = mode === "in_person" ? (data.ordering_food ?? null) : null;
  let finalStatus: "yes" | "no" | "waitlist" = data.status;
  let waitlisted = false;
  if (data.status === "yes" && (await shouldWaitlist(invitationId, effectivePartySize, mode))) {
    finalStatus = "waitlist";
    waitlisted = true;
  }

  // SECURITY: For matched (pre-existing) invitations — especially admin-uploaded
  // records that have already been sent an SMS — do NOT overwrite guest_name /
  // guest_phone from an unauthenticated submitter. Anyone who
  // knows a phone number could otherwise rewrite the invitee's identity.
  // Only fill fields that are currently empty.
  if (!isNewInvitation) {
    const { data: current } = await supabaseAdmin
      .from("invitations")
      .select("guest_name, guest_phone, invite_sent_at")
      .eq("id", invitationId)
      .maybeSingle();
    const patch: { guest_name?: string; guest_phone?: string } = {};
    if (current && !current.invite_sent_at) {
      if (!current.guest_name && data.guest_name) patch.guest_name = data.guest_name;
      if (!current.guest_phone && phone) patch.guest_phone = phone;
      if (Object.keys(patch).length > 0) {
        const { error: invUpdateErr } = await supabaseAdmin
          .from("invitations")
          .update(patch)
          .eq("id", invitationId);
        if (invUpdateErr) throw publicDbError(invUpdateErr);
      }
    }
  }

  const { error: rsvpErr } = await supabaseAdmin.from("rsvps").upsert(
    {
      invitation_id: invitationId,
      status: finalStatus,
      party_size: effectivePartySize,
      attendance_mode: mode,
      ordering_food: orderingFood,
      message: null,
      invited_by: invitedBy.text,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "invitation_id" },
  );
  if (rsvpErr) throw publicDbError(rsvpErr);

  if (invitedBy.needsReview) {
    await logRsvpEvent(
      "RSVP REFERRER NEEDS REVIEW",
      {
        source: "public",
        invited_by_raw: invitedBy.text,
        guest_name: data.guest_name,
        invitation_id: invitationId,
      },
      true,
      invitationId,
    );
  }

  // Capture cuisine pre-order interest (separate table, no restaurant binding yet).
  // Additive only: an RSVP submission can add or raise meals, but it can never
  // reduce, remove, or delete meals already on record.
  let mealPreorderClosed = false;
  if (selections.length > 0 && (data.guest_name || phone)) {
    const { error: mealErr } = await supabaseAdmin.rpc("save_meal_order" as any, {
      _invitation_id: invitationId,
      _name: data.guest_name.slice(0, 120),
      _phone: (phone ?? "").slice(0, 40) || "—",
      _submitted: selections,
      _confirmed_removals: [],
      _mode: "additive",
    });
    if (mealErr) {
      // Past the pre-order cutoff this is expected: the RSVP itself is already
      // saved, so keep it and tell the guest the meal step is closed.
      if (!isPreordersClosed(mealErr)) throw publicDbError(mealErr);
      mealPreorderClosed = true;
    }
  }


  return {
    ok: true,
    invitation_id: invitationId,
    waitlisted,
    referrerNeedsReview: invitedBy.needsReview,
    mealPreorderClosed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: list & restore archived (deleted) rows
// ─────────────────────────────────────────────────────────────────────────────

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listDeletedRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table?: string; days?: number }) => ({
    table: d.table ?? "invitations",
    days: Math.min(Math.max(d.days ?? 30, 1), 365),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("deleted_rows_archive")
      .select("id, table_name, row_id, row_data, deleted_by_name, deleted_by_phone, deleted_at")
      .eq("table_name", data.table)
      .gte("deleted_at", since)
      .order("deleted_at", { ascending: false })
      .limit(500);
    if (error) throw publicDbError(error);
    return { rows: rows ?? [] };
  });

export const restoreDeletedRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { archive_id: string }) => ({ archive_id: String(d.archive_id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: arch, error: aerr } = await supabaseAdmin
      .from("deleted_rows_archive")
      .select("table_name, row_data")
      .eq("id", data.archive_id)
      .maybeSingle();
    if (aerr || !arch) throw new Error("Archive entry not found");

    const allowed = new Set([
      "invitations",
      "rsvps",
      "inviters",
      "team_invites",
      "cuisine_preorders",
    ]);
    if (!allowed.has(arch.table_name)) throw new Error("Unsupported table");

    const row = arch.row_data as Record<string, unknown>;
    const { error: insErr } = await supabaseAdmin.from(arch.table_name as any).insert(row);
    if (insErr) throw publicDbError(insErr, `Restore failed: ${insErr.message}`);

    await supabaseAdmin.from("deleted_rows_archive").delete().eq("id", data.archive_id);
    return { ok: true };
  });
