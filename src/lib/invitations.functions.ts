import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicDbError(error: { message?: string } | null | undefined, fallback = "Something went wrong. Please try again."): Error {
  if (error?.message) console.error("[invitations] db error:", error.message);
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
  if (lower.includes("african") || lower.includes("africa") || lower.includes("mozambique")) return "African";
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
  return { selections, updated_at: row.updated_at ?? null };
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
    return { invitation: inv, rsvp, order, preorder };
  });

// Determine if a "yes" RSVP should be placed on the waiting list because
// the inviter's quota is already full. Counts existing "yes" seats for
// every invitation tied to the same inviter (host_id) and compares to quota.
async function shouldWaitlist(invitationId: string, partySize: number): Promise<boolean> {
  const { data: inv } = await supabaseAdmin
    .from("invitations")
    .select("host_id")
    .eq("id", invitationId)
    .maybeSingle();
  const hostId = (inv as any)?.host_id;
  if (!hostId) return false;
  const { data: inviter } = await supabaseAdmin
    .from("inviters")
    .select("quota")
    .eq("host_id", hostId)
    .maybeSingle();
  const quota = (inviter as any)?.quota;
  if (!quota || quota <= 0) return false;
  const { data: invs } = await supabaseAdmin.from("invitations").select("id").eq("host_id", hostId);
  const otherIds = ((invs as any[]) ?? []).map((r) => r.id).filter((id) => id !== invitationId);
  if (otherIds.length === 0) return partySize > quota;
  const { data: yesRsvps } = await supabaseAdmin
    .from("rsvps")
    .select("party_size,status")
    .in("invitation_id", otherIds)
    .eq("status", "yes");
  const used = ((yesRsvps as any[]) ?? []).reduce((s, r) => s + (r.party_size ?? 1), 0);
  return used + partySize > quota;
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
        "id,event_id,guest_name,guest_phone,notes,invite_sent_at,events(title,description,starts_at,ends_at,location,virtual_link)",
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
    return { invitation: inv, rsvp, order, preorder, expired: false };
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
    if (data.status === "yes" && (await shouldWaitlist(inv.id, effectivePartySize))) {
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
        invited_by: data.invited_by?.trim() || null,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "invitation_id" },
    );
    if (error) throw publicDbError(error);
    return { ok: true, waitlisted };
  });

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
        qty: z.number().int().min(1).max(50),
      }),
    )
    .max(10),
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

export const submitCuisinePreorder = createServerFn({ method: "POST" })
  .inputValidator((d) => CuisinePreorderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone")
      .in("rsvp_token", rsvpTokenCandidates(data.token))
      .maybeSingle();
    if (!inv) throw new Error("Invitation not found");

    if (data.selections.length > 0) {
      const { error } = await supabaseAdmin.from("cuisine_preorders").upsert(
        {
          invitation_id: inv.id,
          name: inv.guest_name.slice(0, 120),
          phone: (inv.guest_phone ?? "").slice(0, 40) || "—",
          selections: data.selections,
        },
        { onConflict: "invitation_id" },
      );
      if (error) throw publicDbError(error);
    } else {
      const { error } = await supabaseAdmin
        .from("cuisine_preorders")
        .delete()
        .eq("invitation_id", inv.id);
      if (error) throw publicDbError(error);
    }

    return { ok: true };
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
    if (!invitation) throw new Error("Please RSVP first using the same mobile number before choosing meals.");

    const { data: rsvp, error: rsvpErr } = await supabaseAdmin
      .from("rsvps")
      .select("status")
      .eq("invitation_id", invitation.id)
      .maybeSingle();
    if (rsvpErr) throw publicDbError(rsvpErr);
    if (rsvp?.status !== "yes") {
      throw new Error("Meal choices are only saved after an attending RSVP is on file.");
    }

    const { error } = await supabaseAdmin.from("cuisine_preorders").insert({
      invitation_id: invitation.id,
      name: (invitation.guest_name || data.name).slice(0, 120),
      phone: (invitation.guest_phone || data.phone).slice(0, 40),
      selections: data.selections,
    });
    if (error) throw publicDbError(error);

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

const PublicRsvpLookupInput = z.object({
  phone: z.string().min(7).max(40),
});

function normalizeAuthPhone(value: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return "";
}

export const getPublicRsvpByPhone = createServerFn({ method: "GET" })
  .inputValidator((d) => PublicRsvpLookupInput.parse(d))
  .handler(async ({ data }) => {
    const phoneNorm = data.phone.replace(/\D/g, "");
    if (phoneNorm.length < 7) throw new Error("Enter a valid mobile number");

    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("id")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!ev) return { invitation: null, rsvp: null, preorder: null };

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
    if (!invitation) return { invitation: null, rsvp: null, preorder: null };

    const [{ data: rsvp, error: rsvpErr }, preorder] = await Promise.all([
        supabaseAdmin
          .from("rsvps")
          .select("status,party_size,attendance_mode,ordering_food,invited_by,responded_at")
          .eq("invitation_id", invitation.id)
          .maybeSingle(),
        findCuisinePreorder(invitation.id, invitation.guest_phone ?? data.phone),
      ]);
    if (rsvpErr) throw publicDbError(rsvpErr);

    return { invitation, rsvp, preorder };
  });

export const submitPublicRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) => PublicRsvpInput.parse(d))
  .handler(async ({ data }) => {
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
      const { data: createdUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser(
        {
          phone: authPhone,
          password,
          phone_confirm: true,
          user_metadata: { display_name: data.guest_name, phone },
        },
      );

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

    // Reuse existing invitation if a matching guest already RSVP'd by phone.
    let invitationId: string | null = null;
    if (phone) {
      const phoneNorm = phone.replace(/\D/g, "");
      if (phoneNorm.length >= 7) {
        const { data: existing } = await supabaseAdmin
          .from("invitations")
          .select("id")
          .eq("event_id", ev.id)
          .in("guest_phone_normalized", phoneCandidates(phoneNorm))
          .maybeSingle();
        if (existing) invitationId = existing.id;
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
    if (data.status === "yes" && (await shouldWaitlist(invitationId, effectivePartySize))) {
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
        invited_by: data.invited_by?.trim() || null,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "invitation_id" },
    );
    if (rsvpErr) throw publicDbError(rsvpErr);

    // Capture cuisine pre-order interest (separate table, no restaurant binding yet)
    if (selections.length > 0 && (data.guest_name || phone)) {
      await supabaseAdmin.from("cuisine_preorders").upsert(
        {
          invitation_id: invitationId,
          name: data.guest_name.slice(0, 120),
          phone: (phone ?? "").slice(0, 40) || "—",
          selections,
        },
        { onConflict: "invitation_id" },
      );
    } else if (invitationId) {
      await supabaseAdmin.from("cuisine_preorders").delete().eq("invitation_id", invitationId);
    }

    return { ok: true, invitation_id: invitationId, waitlisted };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Admin: list & restore archived (deleted) rows
// ─────────────────────────────────────────────────────────────────────────────

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
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

    const allowed = new Set(["invitations", "rsvps", "inviters", "team_invites", "cuisine_preorders"]);
    if (!allowed.has(arch.table_name)) throw new Error("Unsupported table");

    const row = arch.row_data as Record<string, unknown>;
    const { error: insErr } = await supabaseAdmin.from(arch.table_name as any).insert(row);
    if (insErr) throw publicDbError(insErr, `Restore failed: ${insErr.message}`);

    await supabaseAdmin.from("deleted_rows_archive").delete().eq("id", data.archive_id);
    return { ok: true };
  });

