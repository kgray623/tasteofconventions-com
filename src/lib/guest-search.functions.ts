import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GuestSearchResult = {
  invitationId: string;
  guestName: string;
  guestPhone: string | null;
  status: string; // "not_confirmed" | "yes" | "no" | "waitlist" | ...
  attendanceMode: string | null;
  partySize: number;
  inviterName: string | null;
  respondedAt: string | null;
};

function digitsOnly(s: string): string {
  return s.replace(/\D+/g, "");
}

export const searchGuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q: string }) => ({ q: String(input?.q ?? "").trim() }))
  .handler(async ({ data, context }): Promise<GuestSearchResult[]> => {
    const { supabase } = context;
    const q = data.q;
    if (q.length < 2) return [];

    const { data: events, error: eventsErr } = await supabase
      .from("events")
      .select("id")
      .order("starts_at")
      .limit(1);
    if (eventsErr) throw new Error(eventsErr.message);
    const eventId = events?.[0]?.id;
    if (!eventId) return [];

    const like = `%${q.replace(/[%_]/g, "")}%`;
    const digits = digitsOnly(q);

    // Match inviters by name -> get host_ids
    const { data: inviterMatches } = await supabase
      .from("inviters")
      .select("host_id,name")
      .ilike("name", like);
    const inviterHostIds = (inviterMatches ?? [])
      .map((r) => r.host_id)
      .filter((v): v is string => !!v);

    // Build OR filter for invitations
    const orParts: string[] = [`guest_name.ilike.${like}`];
    if (digits.length >= 3) {
      orParts.push(`guest_phone_normalized.ilike.%${digits}%`);
      orParts.push(`guest_phone.ilike.%${digits}%`);
    } else {
      orParts.push(`guest_phone.ilike.${like}`);
    }
    if (inviterHostIds.length > 0) {
      orParts.push(`host_id.in.(${inviterHostIds.join(",")})`);
    }

    const { data: invitations, error: invErr } = await supabase
      .from("invitations")
      .select("id,guest_name,guest_phone,host_id")
      .eq("event_id", eventId)
      .or(orParts.join(","))
      .order("guest_name")
      .limit(25);
    if (invErr) throw new Error(invErr.message);

    const rows = invitations ?? [];
    if (rows.length === 0) return [];

    const invIds = rows.map((r) => r.id);
    const hostIds = Array.from(new Set(rows.map((r) => r.host_id).filter(Boolean))) as string[];

    const [rsvpsRes, allInvitersRes] = await Promise.all([
      supabase
        .from("rsvps")
        .select("invitation_id,status,party_size,attendance_mode,responded_at")
        .in("invitation_id", invIds),
      hostIds.length > 0
        ? supabase.from("inviters").select("host_id,name").in("host_id", hostIds)
        : Promise.resolve({ data: [] as { host_id: string; name: string | null }[], error: null }),
    ]);

    const rsvpByInv = new Map<string, { status: string | null; party_size: number | null; attendance_mode: string | null; responded_at: string | null }>();
    for (const r of rsvpsRes.data ?? []) {
      rsvpByInv.set(r.invitation_id as string, r as never);
    }
    const inviterByHost = new Map<string, string | null>();
    for (const r of (allInvitersRes.data ?? []) as { host_id: string; name: string | null }[]) {
      inviterByHost.set(r.host_id, r.name);
    }

    return rows.map((row) => {
      const rsvp = rsvpByInv.get(row.id);
      return {
        invitationId: row.id,
        guestName: row.guest_name,
        guestPhone: row.guest_phone,
        status: rsvp?.status ?? "not_confirmed",
        attendanceMode: rsvp?.attendance_mode ?? null,
        partySize: rsvp?.party_size ?? 1,
        inviterName: row.host_id ? inviterByHost.get(row.host_id) ?? null : null,
        respondedAt: rsvp?.responded_at ?? null,
      };
    });
  });
