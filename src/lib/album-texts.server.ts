// Server-only helper for the "Photo album announcement" texting screen.
//
// Audience: every guest whose RSVP is "yes" — in person and Zoom together — as
// one flat list. Declines, "maybe", and invitations that never replied are all
// excluded. Duplicate phone numbers collapse to a single row so nobody gets two
// texts. Guests with no phone on file are still returned (flagged) so they stay
// visible instead of quietly disappearing.
import { resolveIdentity } from "@/lib/committee-meal-texts.server";
import { DEFAULT_ALBUM_TEXT_TEMPLATE } from "@/lib/album-text";
import { phoneTail } from "@/lib/phone";

export type AlbumAudience = "in_person" | "zoom";

export type AlbumTextGuest = {
  invitationId: string;
  name: string;
  phone: string;
  hasPhone: boolean;
  status: string;
  attendanceMode: string;
  audience: AlbumAudience;
  partySize: number;
  sentAt: string | null;
  markedByLabel: string | null;
};

export type AlbumTextResult = {
  guests: AlbumTextGuest[];
  totals: {
    guests: number;
    sent: number;
    toSend: number;
    noPhone: number;
    inPerson: number;
    zoom: number;
    /** People (seats), matching the Admin overview RSVP totals exactly. */
    peopleInPerson: number;
    peopleZoom: number;
    peopleTotal: number;
  };

  template: string;
  isAdmin: boolean;
  generated_at: string;
};

export async function loadAlbumTextList(
  supabase: any,
  userId: string,
): Promise<AlbumTextResult> {
  const identity = await resolveIdentity(supabase, userId);
  if (!identity.isStaff) throw new Error("Forbidden");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: events }, { data: setting }, { data: sends }] = await Promise.all([
    supabaseAdmin.from("events").select("id").order("starts_at").limit(1),
    supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "album_text_template")
      .maybeSingle(),
    supabaseAdmin.from("album_text_sends").select("invitation_id,sent_at,marked_by_label"),
  ]);

  const sentByInvitation = new Map(
    (
      (sends ?? []) as Array<{
        invitation_id: string;
        sent_at: string;
        marked_by_label: string | null;
      }>
    ).map((s) => [s.invitation_id, s] as const),
  );

  const template = (setting?.value as string | undefined) ?? DEFAULT_ALBUM_TEXT_TEMPLATE;

  const eventId = events?.[0]?.id as string | undefined;
  const base = { template, isAdmin: identity.isAdmin, generated_at: new Date().toISOString() };
  const emptyTotals = {
    guests: 0,
    sent: 0,
    toSend: 0,
    noPhone: 0,
    inPerson: 0,
    zoom: 0,
    peopleInPerson: 0,
    peopleZoom: 0,
    peopleTotal: 0,
  };

  if (!eventId) return { ...base, guests: [], totals: emptyTotals };

  const [{ data: invitations }, { data: rsvps }] = await Promise.all([
    supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone,guest_phone_normalized")
      .eq("event_id", eventId),

    supabaseAdmin
      .from("rsvps")
      .select("invitation_id,status,attendance_mode,party_size")
      .eq("status", "yes"),
  ]);

  // One "yes" RSVP per invitation.
  const rsvpByInvitation = new Map<
    string,
    { attendance_mode: string | null; party_size: number | null }
  >();
  for (const r of (rsvps ?? []) as any[]) {
    if (!r?.invitation_id) continue;
    if (rsvpByInvitation.has(r.invitation_id as string)) continue;
    rsvpByInvitation.set(r.invitation_id as string, {
      attendance_mode: (r.attendance_mode ?? null) as string | null,
      party_size: (r.party_size ?? null) as number | null,
    });
  }

  // One text per phone number: first row wins, unless a later row is the one
  // already marked as texted.
  const seenPhone = new Map<string, AlbumTextGuest>();
  const guests: AlbumTextGuest[] = [];

  for (const inv of (invitations ?? []) as Array<{
    id: string;
    guest_name: string;
    guest_phone: string | null;
  }>) {
    const rsvp = rsvpByInvitation.get(inv.id);
    if (!rsvp) continue;

    const audience: AlbumAudience =
      (rsvp.attendance_mode ?? "in_person") === "zoom" ? "zoom" : "in_person";
    const rawPhone = (inv.guest_phone ?? "").trim();
    const hasPhone = phoneTail(rawPhone).length >= 7;
    const sent = sentByInvitation.get(inv.id) ?? null;
    const guest: AlbumTextGuest = {
      invitationId: inv.id,
      name: (inv.guest_name ?? "").trim() || "Guest",
      phone: hasPhone ? rawPhone : "",
      hasPhone,
      status: "yes",
      attendanceMode: rsvp.attendance_mode ?? "in_person",
      audience,
      partySize: Math.max(1, Number(rsvp.party_size ?? 1) || 1),
      sentAt: sent?.sent_at ?? null,
      markedByLabel: sent?.marked_by_label ?? null,
    };

    if (hasPhone) {
      const key = phoneTail(rawPhone);
      const kept = seenPhone.get(key);
      if (kept) {
        if (!(!kept.sentAt && guest.sentAt)) continue;
        const idx = guests.findIndex((g) => g.invitationId === kept.invitationId);
        if (idx >= 0) guests.splice(idx, 1);
      }
      seenPhone.set(key, guest);
    }

    guests.push(guest);
  }

  guests.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  // People (seats) counted with the exact same math the Admin overview RSVP
  // totals card uses, so the two screens can never disagree.
  const idToGroup = buildDuplicateGroupIds(
    (invitations ?? []).map((inv: any) => ({
      id: inv.id as string,
      guest_name: (inv.guest_name ?? null) as string | null,
      guest_phone_normalized: (inv.guest_phone_normalized ?? null) as string | null,
    })),
  );
  const rollup = computeRsvpRollup(
    (invitations ?? []).map((inv: any) => {
      const rsvp = rsvpByInvitation.get(inv.id as string);
      return {
        id: inv.id as string,
        groupId: idToGroup.get(inv.id as string) ?? (inv.id as string),
        status: rsvp ? "yes" : null,
        party_size: rsvp?.party_size ?? 1,
        attendance_mode: rsvp?.attendance_mode ?? null,
      };
    }),
  );
  const peopleInPerson = rollup.people.inPerson;
  const peopleZoom = rollup.people.zoom;

  return {
    ...base,
    guests,
    totals: {
      guests: guests.length,
      sent: guests.filter((g) => g.sentAt).length,
      toSend: guests.filter((g) => !g.sentAt).length,
      noPhone: guests.filter((g) => !g.hasPhone).length,
      inPerson: guests.filter((g) => g.audience === "in_person").length,
      zoom: guests.filter((g) => g.audience === "zoom").length,
      peopleInPerson,
      peopleZoom,
      peopleTotal: peopleInPerson + peopleZoom,
    },
  };
}



/**
 * Manual "I sent that album announcement" mark. Only ever written by an explicit
 * human tap on /admin/album-texts — nothing auto-marks.
 */
export async function markAlbumTextSent(
  supabase: any,
  userId: string,
  input: { invitationId: string; sent: boolean },
) {
  const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
  await assertMealStaff(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const label = ((profile?.display_name as string | null) ?? "").trim() || null;

  if (!input.sent) {
    const { error } = await supabaseAdmin
      .from("album_text_sends")
      .delete()
      .eq("invitation_id", input.invitationId);
    if (error) throw new Error(error.message);
    return { ok: true, sentAt: null };
  }

  const sentAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("album_text_sends")
    .upsert(
      {
        invitation_id: input.invitationId,
        sent_at: sentAt,
        marked_by: userId,
        marked_by_label: label,
        updated_at: sentAt,
      },
      { onConflict: "invitation_id" },
    )
    .select("invitation_id,sent_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The album text mark could not be verified");
  return { ok: true, sentAt: data.sent_at as string };
}
