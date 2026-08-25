// Server-only helper for the "covered dish" reminder list: every guest who is
// coming in person but has NO catered meal order, grouped by the committee
// member who invited them.
//
// Read-only reporting. Nothing here writes, marks, or hides anything — the same
// matching rules as `loadCommitteeMealTexts` are used so the two pages can
// never disagree about who has a meal order.
import { phoneTail } from "@/lib/phone";
import { resolveIdentity } from "@/lib/committee-meal-texts.server";

export const DEFAULT_COVERED_DISH_TEMPLATE =
  "Hi {name}! You're on the list for A Taste of Special Conventions — Sunday, August 30, 4:00 PM at Eagle's Landing. Since you're not having a catered meal, please bring a covered dish to share. Thanks so much!";

export type CoveredDishGuest = {
  invitationId: string;
  name: string;
  phone: string;
  partySize: number;
  attendanceMode: string;
};

export type CoveredDishGroup = {
  inviterId: string | null;
  inviterName: string;
  guests: CoveredDishGuest[];
  seats: number;
};

export type CoveredDishResult = {
  groups: CoveredDishGroup[];
  totals: { guests: number; seats: number; members: number };
  template: string;
  isAdmin: boolean;
  generated_at: string;
};

/** Fill {name} (and legacy {guest}) in the reminder template. */
export function renderCoveredDishText(template: string, guestName: string) {
  const first = (guestName ?? "").trim().split(/\s+/)[0] ?? "";
  return (template || DEFAULT_COVERED_DISH_TEMPLATE)
    .replaceAll("{name}", first || guestName || "there")
    .replaceAll("{guest}", guestName || first || "there")
    .replaceAll("{fullName}", guestName || first || "there");
}

export async function loadCoveredDishList(
  supabase: any,
  userId: string,
): Promise<CoveredDishResult> {
  const identity = await resolveIdentity(supabase, userId);
  if (!identity.isStaff) throw new Error("Forbidden");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: events }, { data: inviterRows }, { data: setting }] = await Promise.all([
    supabaseAdmin.from("events").select("id").order("starts_at").limit(1),
    supabaseAdmin.from("inviters").select("id,name"),
    supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "covered_dish_text_template")
      .maybeSingle(),
  ]);

  const template = (setting?.value as string | undefined) ?? DEFAULT_COVERED_DISH_TEMPLATE;
  const inviterNameById = new Map(
    ((inviterRows ?? []) as Array<{ id: string; name: string | null }>).map(
      (r) => [r.id, (r.name ?? "").trim() || "Committee member"] as const,
    ),
  );

  const eventId = events?.[0]?.id as string | undefined;
  const base = { template, isAdmin: identity.isAdmin, generated_at: new Date().toISOString() };
  if (!eventId) return { ...base, groups: [], totals: { guests: 0, seats: 0, members: 0 } };

  const [{ data: invitations }, { data: rsvps }, { data: preorders }] = await Promise.all([
    supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone,inviter_id")
      .eq("event_id", eventId),
    supabaseAdmin
      .from("rsvps")
      .select("invitation_id,status,attendance_mode,party_size"),
    supabaseAdmin.from("cuisine_preorders").select("id,phone,selections,invitation_id"),
  ]);

  // Any preorder with at least one plate counts as "has a catered meal".
  const orderedInvitationIds = new Set<string>();
  const orderedTails = new Set<string>();
  for (const p of (preorders ?? []) as any[]) {
    const sel = Array.isArray(p.selections) ? p.selections : [];
    const plates = sel.reduce((sum: number, item: any) => {
      const qty = Number(item?.qty);
      return sum + (Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 0);
    }, 0);
    if (plates <= 0) continue;
    if (p.invitation_id) orderedInvitationIds.add(p.invitation_id as string);
    const tail = phoneTail(p.phone);
    if (tail.length >= 7) orderedTails.add(tail);
  }

  const rsvpByInvitation = new Map<
    string,
    { status: string; attendance_mode: string | null; party_size: number | null }
  >();
  for (const r of (rsvps ?? []) as any[]) {
    if (!r?.invitation_id) continue;
    rsvpByInvitation.set(r.invitation_id as string, {
      status: (r.status ?? "") as string,
      attendance_mode: (r.attendance_mode ?? null) as string | null,
      party_size: (r.party_size ?? null) as number | null,
    });
  }

  const groupMap = new Map<string, CoveredDishGroup>();
  for (const inv of (invitations ?? []) as Array<{
    id: string;
    guest_name: string;
    guest_phone: string | null;
    inviter_id: string | null;
  }>) {
    const rsvp = rsvpByInvitation.get(inv.id);
    if (!rsvp || rsvp.status !== "yes") continue;
    const mode = rsvp.attendance_mode ?? "in_person";
    if (mode === "zoom") continue;

    const tail = phoneTail(inv.guest_phone);
    const hasMeal =
      orderedInvitationIds.has(inv.id) || (tail.length >= 7 && orderedTails.has(tail));
    if (hasMeal) continue;

    const key = inv.inviter_id ?? "__none__";
    const group =
      groupMap.get(key) ??
      ({
        inviterId: inv.inviter_id ?? null,
        inviterName: inv.inviter_id
          ? (inviterNameById.get(inv.inviter_id) ?? "Committee member")
          : "No committee member recorded",
        guests: [],
        seats: 0,
      } as CoveredDishGroup);
    const partySize = Math.max(1, Number(rsvp.party_size ?? 1) || 1);
    group.guests.push({
      invitationId: inv.id,
      name: (inv.guest_name ?? "").trim() || "Guest",
      phone: (inv.guest_phone ?? "").trim(),
      partySize,
      attendanceMode: mode,
    });
    group.seats += partySize;
    groupMap.set(key, group);
  }

  const groups = Array.from(groupMap.values())
    .map((g) => ({
      ...g,
      guests: g.guests.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    }))
    .sort(
      (a, b) =>
        b.guests.length - a.guests.length ||
        a.inviterName.localeCompare(b.inviterName, undefined, { sensitivity: "base" }),
    );

  return {
    ...base,
    groups,
    totals: {
      guests: groups.reduce((sum, g) => sum + g.guests.length, 0),
      seats: groups.reduce((sum, g) => sum + g.seats, 0),
      members: groups.length,
    },
  };
}
