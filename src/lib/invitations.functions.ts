import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public lookup of an invitation by RSVP token (used on the guest magic-link page)
export const getInvitationByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(8).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select("id,event_id,guest_name,guest_email,notes,events(title,description,starts_at,ends_at,location,virtual_link)")
      .eq("rsvp_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { invitation: null, rsvp: null, order: null };
    const { data: rsvp } = await supabaseAdmin.from("rsvps").select("*").eq("invitation_id", inv.id).maybeSingle();
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("invitation_id", inv.id).maybeSingle();
    return { invitation: inv, rsvp, order };
  });

const RsvpInput = z.object({
  token: z.string().min(8).max(120),
  status: z.enum(["yes", "no", "maybe"]),
  party_size: z.number().int().min(1).max(20),
  dietary_notes: z.string().max(500).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});

export const submitRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) => RsvpInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations").select("id").eq("rsvp_token", data.token).maybeSingle();
    if (!inv) throw new Error("Invitation not found");
    const { error } = await supabaseAdmin.from("rsvps").upsert({
      invitation_id: inv.id,
      status: data.status,
      party_size: data.party_size,
      dietary_notes: data.dietary_notes ?? null,
      message: data.message ?? null,
      responded_at: new Date().toISOString(),
    }, { onConflict: "invitation_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const OrderInput = z.object({
  token: z.string().min(8).max(120),
  restaurant_id: z.string().uuid(),
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
  notes: z.string().max(500).optional().nullable(),
});

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => OrderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("invitations").select("id").eq("rsvp_token", data.token).maybeSingle();
    if (!inv) throw new Error("Invitation not found");
    const total = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const { error } = await supabaseAdmin.from("orders").upsert({
      invitation_id: inv.id,
      restaurant_id: data.restaurant_id,
      items: data.items,
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
  message: z.string().max(1000).optional().nullable(),
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

      const userId = createdUser.user?.id ?? await getUserIdByEmail(email);
      if (userId) {
        if (!createdUser.user) {
          const { error: updateUserErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password,
            user_metadata: { display_name: data.guest_name },
          });
          if (updateUserErr) throw new Error(updateUserErr.message);
        }
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
          guest_email_normalized: email ? email.toLowerCase() : null,
          guest_phone: phone,
          guest_phone_normalized: phone ? phone.replace(/\D/g, "") : null,
        }).select("id").single();
      if (invErr) throw new Error(invErr.message);
      invitationId = inv.id;
    }

    const { error: rsvpErr } = await supabaseAdmin.from("rsvps").upsert({
      invitation_id: invitationId,
      status: data.status,
      party_size: data.party_size,
      message: data.message ?? null,
      responded_at: new Date().toISOString(),
    }, { onConflict: "invitation_id" });
    if (rsvpErr) throw new Error(rsvpErr.message);

    return { ok: true, invitation_id: invitationId };
  });
