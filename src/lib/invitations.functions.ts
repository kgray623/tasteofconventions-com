import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTransactionalEmailServer } from "@/lib/email/send-server";

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

    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select("id,event_id,guest_name,guest_email,guest_phone,notes,rsvp_token,created_at,events(title,description,starts_at,ends_at,location,virtual_link)")
      .eq("guest_phone_normalized", phoneNorm)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { invitation: null, rsvp: null, order: null };
    const { data: rsvp } = await supabaseAdmin.from("rsvps").select("*").eq("invitation_id", inv.id).maybeSingle();
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("invitation_id", inv.id).maybeSingle();
    return { invitation: inv, rsvp, order };
  });

async function sendRsvpConfirmation(invitationId: string, status: "yes" | "no" | "maybe", partySize: number) {
  try {
    const { data: inv } = await supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_email,events(title,starts_at,location)")
      .eq("id", invitationId)
      .maybeSingle();
    const email = inv?.guest_email;
    if (!email) return;
    const ev = (inv as any)?.events;
    await sendTransactionalEmailServer({
      templateName: "rsvp-confirmation",
      recipientEmail: email,
      idempotencyKey: `rsvp-confirm-${invitationId}-${status}`,
      templateData: {
        guestName: inv?.guest_name,
        eventTitle: ev?.title,
        eventStartsAt: ev?.starts_at,
        location: ev?.location,
        status,
        partySize,
      },
    });
  } catch (err) {
    console.error("[rsvp] failed to send confirmation email", err);
  }
}

// Determine if a "yes" RSVP should be placed on the waiting list because
// the inviter's quota is already full. Counts existing "yes" seats for
// every invitation tied to the same inviter (host_id) and compares to quota.
async function shouldWaitlist(invitationId: string, partySize: number): Promise<boolean> {
  const { data: inv } = await supabaseAdmin
    .from("invitations").select("host_id").eq("id", invitationId).maybeSingle();
  const hostId = (inv as any)?.host_id;
  if (!hostId) return false;
  const { data: inviter } = await supabaseAdmin
    .from("inviters").select("quota").eq("host_id", hostId).maybeSingle();
  const quota = (inviter as any)?.quota;
  if (!quota || quota <= 0) return false;
  const { data: invs } = await supabaseAdmin
    .from("invitations").select("id").eq("host_id", hostId);
  const otherIds = ((invs as any[]) ?? []).map((r) => r.id).filter((id) => id !== invitationId);
  if (otherIds.length === 0) return partySize > quota;
  const { data: yesRsvps } = await supabaseAdmin
    .from("rsvps").select("party_size,status").in("invitation_id", otherIds).eq("status", "yes");
  const used = ((yesRsvps as any[]) ?? []).reduce((s, r) => s + (r.party_size ?? 1), 0);
  return used + partySize > quota;
}

function rsvpTokenCandidates(token: string) {
  const trimmed = token.trim();
  return Array.from(new Set([
    trimmed,
    trimmed.replace(/ /g, "+"),
    trimmed.replace(/-/g, "+").replace(/_/g, "/"),
  ].filter(Boolean)));
}

// Public lookup of an invitation by RSVP token (used on the guest magic-link page)
export const getInvitationByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(8).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select("id,event_id,guest_name,guest_email,guest_phone,notes,invite_sent_at,rsvp_expires_at,events(title,description,starts_at,ends_at,location,virtual_link)")
      .in("rsvp_token", rsvpTokenCandidates(data.token))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { invitation: null, rsvp: null, order: null, expired: false };
    const { data: rsvp } = await supabaseAdmin.from("rsvps").select("*").eq("invitation_id", inv.id).maybeSingle();
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("invitation_id", inv.id).maybeSingle();
    const expired = Boolean(
      (inv as any).rsvp_expires_at &&
        new Date((inv as any).rsvp_expires_at).getTime() < Date.now() &&
        rsvp?.status !== "yes",
    );
    return { invitation: inv, rsvp, order, expired };
  });

const RsvpInput = z.object({
  token: z.string().min(8).max(120),
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
      .from("invitations").select("id,rsvp_expires_at").in("rsvp_token", rsvpTokenCandidates(data.token)).maybeSingle();
    if (!inv) throw new Error("Invitation not found");
    const { data: existingRsvp } = await supabaseAdmin
      .from("rsvps").select("status").eq("invitation_id", inv.id).maybeSingle();
    if (
      (inv as any).rsvp_expires_at &&
      new Date((inv as any).rsvp_expires_at).getTime() < Date.now() &&
      existingRsvp?.status !== "yes"
    ) {
      throw new Error("This invitation has expired. Please ask the person who invited you to send a new link.");
    }
    const mode = data.attendance_mode ?? "in_person";
    const effectivePartySize = mode === "zoom" ? 1 : data.party_size;
    const orderingFood = mode === "in_person" ? (data.ordering_food ?? null) : null;
    let finalStatus: "yes" | "no" | "maybe" | "waitlist" = data.status;
    let waitlisted = false;
    if (data.status === "yes" && await shouldWaitlist(inv.id, effectivePartySize)) {
      finalStatus = "waitlist";
      waitlisted = true;
    }
    const { error } = await supabaseAdmin.from("rsvps").upsert({
      invitation_id: inv.id,
      status: finalStatus,
      party_size: effectivePartySize,
      attendance_mode: mode,
      ordering_food: orderingFood,
      dietary_notes: data.dietary_notes ?? null,
      message: null,
      invited_by: data.invited_by?.trim() || null,
      responded_at: new Date().toISOString(),
    }, { onConflict: "invitation_id" });
    if (error) throw new Error(error.message);
    await sendRsvpConfirmation(inv.id, data.status, effectivePartySize);
    return { ok: true, waitlisted };
  });


const OrderInput = z.object({
  token: z.string().min(8).max(120),
  restaurant_id: z.string().uuid(),
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    name: z.string().max(200).optional(),
    price: z.number().optional(), // ignored server-side; authoritative price is loaded from DB
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
  notes: z.string().max(500).optional().nullable(),
});

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => OrderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations").select("id").in("rsvp_token", rsvpTokenCandidates(data.token)).maybeSingle();
    if (!inv) throw new Error("Invitation not found");

    // Authoritative pricing: load menu items from DB. NEVER trust client-supplied price.
    const ids = Array.from(new Set(data.items.map((i) => i.menu_item_id)));
    const { data: menuItems, error: menuErr } = await supabaseAdmin
      .from("menu_items")
      .select("id,name,price,restaurant_id,available")
      .in("id", ids);
    if (menuErr) throw new Error(menuErr.message);
    const byId = new Map((menuItems ?? []).map((m) => [m.id, m]));
    if (byId.size !== ids.length) throw new Error("Unknown menu item");

    const verifiedItems = data.items.map((i) => {
      const m = byId.get(i.menu_item_id)!;
      if (m.restaurant_id !== data.restaurant_id) throw new Error("Item not in selected restaurant");
      if (m.available === false) throw new Error("Item not available");
      return { menu_item_id: m.id, name: m.name, price: Number(m.price), quantity: i.quantity };
    });
    const total = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const { error } = await supabaseAdmin.from("orders").upsert({
      invitation_id: inv.id,
      restaurant_id: data.restaurant_id,
      items: verifiedItems,
      total,
      notes: data.notes ?? null,
    }, { onConflict: "invitation_id" });
    if (error) throw new Error(error.message);
    return { ok: true, total };
  });

const PublicRsvpInput = z.object({
  guest_name: z.string().min(1).max(120),
  guest_email: z.string().email().max(200).optional().nullable(),
  guest_phone: z.string().max(40).optional().nullable(),
  password: z.string().min(6).max(72).optional().nullable(),
  status: z.enum(["yes", "no"]),
  party_size: z.number().int().min(1).max(20),
  attendance_mode: z.enum(["in_person", "zoom"]).optional(),
  ordering_food: z.boolean().optional().nullable(),
  invited_by: z.string().max(200).optional().nullable(),
  cuisine_selections: z.array(z.object({
    cuisine: z.string().min(1).max(80),
    qty: z.number().int().min(1).max(50),
  })).max(10).optional().nullable(),
});


export const submitPublicRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) => PublicRsvpInput.parse(d))
  .handler(async ({ data }) => {
    // Find an event to attach to
    const { data: ev } = await supabaseAdmin
      .from("events").select("id").order("starts_at", { ascending: true }).limit(1).maybeSingle();
    if (!ev) throw new Error("No event configured yet");
    // Find a host (first profile / admin)
    const { data: host } = await supabaseAdmin
      .from("profiles").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!host) throw new Error("No host configured yet");

    const email = data.guest_email?.trim() || null;
    const phone = data.guest_phone?.trim() || null;
    const password = data.password?.trim() || null;

    if (email && password) {
      const { data: createdUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: data.guest_name },
      });

      if (createUserErr && !/already|registered|exists/i.test(createUserErr.message)) {
        throw new Error(createUserErr.message);
      }

      // SECURITY: Only seed profile for newly created users. NEVER call
      // updateUserById here — that would let an anonymous RSVP submission
      // overwrite the password of any existing account (account takeover).
      // If the email is already registered, silently skip account setup;
      // the user can sign in with their existing credentials.
      const userId = createdUser?.user?.id ?? null;
      if (userId) {
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          email,
          display_name: data.guest_name,
        });
      }
    }

    // Reuse existing invitation if a matching guest already RSVP'd (by email or phone)
    let invitationId: string | null = null;
    if (email) {
      const { data: existing } = await supabaseAdmin
        .from("invitations").select("id").eq("event_id", ev.id)
        .eq("guest_email_normalized", email.toLowerCase()).maybeSingle();
      if (existing) invitationId = existing.id;
    }
    if (!invitationId && phone) {
      const phoneNorm = phone.replace(/\D/g, "");
      if (phoneNorm.length >= 7) {
        const { data: existing } = await supabaseAdmin
          .from("invitations").select("id").eq("event_id", ev.id)
          .eq("guest_phone_normalized", phoneNorm).maybeSingle();
        if (existing) invitationId = existing.id;
      }
    }

    if (!invitationId) {
      const { data: inv, error: invErr } = await supabaseAdmin
        .from("invitations").insert({
          event_id: ev.id,
          host_id: host.id,
          guest_name: data.guest_name,
          guest_email: email,
          guest_phone: phone,
        }).select("id").single();
      if (invErr) throw new Error(invErr.message);
      invitationId = inv.id;
    }

    const mode = data.attendance_mode ?? "in_person";
    const effectivePartySize = mode === "zoom" ? 1 : data.party_size;
    const orderingFood = mode === "in_person" ? (data.ordering_food ?? null) : null;
    let finalStatus: "yes" | "no" | "waitlist" = data.status;
    let waitlisted = false;
    if (data.status === "yes" && await shouldWaitlist(invitationId, effectivePartySize)) {
      finalStatus = "waitlist";
      waitlisted = true;
    }
    const { error: rsvpErr } = await supabaseAdmin.from("rsvps").upsert({
      invitation_id: invitationId,
      status: finalStatus,
      party_size: effectivePartySize,
      attendance_mode: mode,
      ordering_food: orderingFood,
      message: null,
      invited_by: data.invited_by?.trim() || null,
      responded_at: new Date().toISOString(),
    }, { onConflict: "invitation_id" });
    if (rsvpErr) throw new Error(rsvpErr.message);

    // Capture cuisine pre-order interest (separate table, no restaurant binding yet)
    const selections = (data.cuisine_selections ?? []).filter((s) => s.qty > 0);
    if (selections.length > 0 && (data.guest_name || phone)) {
      await supabaseAdmin.from("cuisine_preorders").upsert({
        invitation_id: invitationId,
        name: data.guest_name.slice(0, 120),
        phone: (phone ?? "").slice(0, 40) || "—",
        selections,
      }, { onConflict: "invitation_id" });
    } else if (invitationId) {
      await supabaseAdmin.from("cuisine_preorders").delete().eq("invitation_id", invitationId);
    }

    await sendRsvpConfirmation(invitationId, data.status, effectivePartySize);
    return { ok: true, invitation_id: invitationId, waitlisted };
  });

