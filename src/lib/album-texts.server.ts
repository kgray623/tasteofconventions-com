// Server-only helper for the "Photo album announcement" texting screen.
//
// Every guest who attended — in person or on Zoom — meaning RSVP status yes or
// maybe, grouped by the committee member who invited them. Declined guests are
// excluded. Guests with no phone on file are still returned (flagged) so they
// stay visible instead of quietly disappearing.
import { resolveIdentity } from "@/lib/committee-meal-texts.server";
import { DEFAULT_ALBUM_TEXT_TEMPLATE } from "@/lib/album-text";
import { phoneTail } from "@/lib/phone";

export type AlbumTextGuest = {
  invitationId: string;
  name: string;
  phone: string;
  hasPhone: boolean;
  status: string;
  attendanceMode: string;
  partySize: number;
  sentAt: string | null;
  markedByLabel: string | null;
};

export type AlbumTextGroup = {
  inviterId: string | null;
  inviterName: string;
  guests: AlbumTextGuest[];
  sent: number;
};

export type AlbumTextResult = {
  groups: AlbumTextGroup[];
  totals: {
    guests: number;
    members: number;
    sent: number;
    toSend: number;
    noPhone: number;
    inPerson: number;
    zoom: number;
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

  const [{ data: events }, { data: inviterRows }, { data: setting }, { data: sends }] =
    await Promise.all([
      supabaseAdmin.from("events").select("id").order("starts_at").limit(1),
      supabaseAdmin.from("inviters").select("id,name"),
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
  const inviterNameById = new Map(
    ((inviterRows ?? []) as Array<{ id: string; name: string | null }>).map(
      (r) => [r.id, (r.name ?? "").trim() || "Committee member"] as const,
    ),
  );

  const eventId = events?.[0]?.id as string | undefined;
  const base = { template, isAdmin: identity.isAdmin, generated_at: new Date().toISOString() };
  const emptyTotals = {
    guests: 0,
    members: 0,
    sent: 0,
    toSend: 0,
    noPhone: 0,
    inPerson: 0,
    zoom: 0,
  };
  if (!eventId) return { ...base, groups: [], totals: emptyTotals };

  const [{ data: invitations }, { data: rsvps }] = await Promise.all([
    supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone,inviter_id")
      .eq("event_id", eventId),
    supabaseAdmin
      .from("rsvps")
      .select("invitation_id,status,attendance_mode,party_size")
      .in("status", ["yes", "maybe"]),
  ]);

  // One RSVP per invitation; a "yes" always wins over "maybe".
  const rsvpByInvitation = new Map<
    string,
    { status: string; attendance_mode: string | null; party_size: number | null }
  >();
  for (const r of (rsvps ?? []) as any[]) {
    if (!r?.invitation_id) continue;
    const existing = rsvpByInvitation.get(r.invitation_id as string);
    if (existing && existing.status === "yes") continue;
    rsvpByInvitation.set(r.invitation_id as string, {
      status: (r.status ?? "") as string,
      attendance_mode: (r.attendance_mode ?? null) as string | null,
      party_size: (r.party_size ?? null) as number | null,
    });
  }

  const groupMap = new Map<string, AlbumTextGroup>();
  for (const inv of (invitations ?? []) as Array<{
    id: string;
    guest_name: string;
    guest_phone: string | null;
    inviter_id: string | null;
  }>) {
    const rsvp = rsvpByInvitation.get(inv.id);
    if (!rsvp) continue;

    const key = inv.inviter_id ?? "__none__";
    const group =
      groupMap.get(key) ??
      ({
        inviterId: inv.inviter_id ?? null,
        inviterName: inv.inviter_id
          ? (inviterNameById.get(inv.inviter_id) ?? "Committee member")
          : "No committee member recorded",
        guests: [],
        sent: 0,
      } as AlbumTextGroup);

    const rawPhone = (inv.guest_phone ?? "").trim();
    const hasPhone = phoneTail(rawPhone).length >= 7;
    const sent = sentByInvitation.get(inv.id) ?? null;
    group.guests.push({
      invitationId: inv.id,
      name: (inv.guest_name ?? "").trim() || "Guest",
      phone: hasPhone ? rawPhone : "",
      hasPhone,
      status: rsvp.status,
      attendanceMode: rsvp.attendance_mode ?? "in_person",
      partySize: Math.max(1, Number(rsvp.party_size ?? 1) || 1),
      sentAt: sent?.sent_at ?? null,
      markedByLabel: sent?.marked_by_label ?? null,
    });
    if (sent) group.sent += 1;
    groupMap.set(key, group);
  }

  const groups = Array.from(groupMap.values())
    .map((g) => ({
      ...g,
      // Not-yet-texted guests first inside each committee group, then A-Z.
      guests: g.guests.sort(
        (a, b) =>
          (a.sentAt ? 1 : 0) - (b.sentAt ? 1 : 0) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    }))
    .sort(
      (a, b) =>
        b.guests.length - a.guests.length ||
        a.inviterName.localeCompare(b.inviterName, undefined, { sensitivity: "base" }),
    );

  const all = groups.flatMap((g) => g.guests);
  return {
    ...base,
    groups,
    totals: {
      guests: all.length,
      members: groups.length,
      sent: all.filter((g) => g.sentAt).length,
      toSend: all.filter((g) => !g.sentAt).length,
      noPhone: all.filter((g) => !g.hasPhone).length,
      inPerson: all.filter((g) => g.attendanceMode !== "zoom").length,
      zoom: all.filter((g) => g.attendanceMode === "zoom").length,
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
