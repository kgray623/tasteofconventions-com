// Server-only helper for the "Zoom Attendees" texting screen.
//
// Every guest whose RSVP is attendance_mode = 'zoom' and status yes/maybe, with
// their phone number and whether the Zoom meeting-link text has been marked as
// sent. Nothing here hides or deletes anything: guests with no phone on file are
// returned too, flagged with hasPhone = false, so they stay visible.
import { phoneTail } from "@/lib/phone";

export const ZOOM_TEXT_BODY = `Topic: Taste of Special Conventions 
Time: Aug 30, 2026 4 PM Central Time (US and Canada)
Join Zoom Meeting
https://us02web.zoom.us/j/84806295296?pwd=XUkTYxinE9ZzJxSH7AXQuSx2jWAEud.1

Meeting ID: 848 0629 5296
Passcode: 1914`;

export type ZoomAttendeeRow = {
  invitationId: string;
  name: string;
  phone: string;
  hasPhone: boolean;
  status: string;
  inviterName: string;
  sentAt: string | null;
  markedByLabel: string | null;
};

export type ZoomTextsResult = {
  rows: ZoomAttendeeRow[];
  totals: { total: number; sent: number; toSend: number; noPhone: number };
  body: string;
  generated_at: string;
};

export async function loadZoomTexts(supabase: any, userId: string): Promise<ZoomTextsResult> {
  const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
  await assertMealStaff(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: rsvpRows, error: rsvpError }, { data: inviterRows }, { data: sends }] =
    await Promise.all([
      supabaseAdmin
        .from("rsvps")
        .select(
          "invitation_id,status,attendance_mode,responded_at,invitations(id,guest_name,guest_phone,inviter_id)",
        )
        .eq("attendance_mode", "zoom")
        .in("status", ["yes", "maybe"]),
      supabaseAdmin.from("inviters").select("id,name"),
      supabaseAdmin.from("zoom_text_sends").select("invitation_id,sent_at,marked_by_label"),
    ]);
  if (rsvpError) throw new Error(rsvpError.message);

  const inviterNameById = new Map(
    ((inviterRows ?? []) as Array<{ id: string; name: string | null }>).map(
      (r) => [r.id, (r.name ?? "").trim() || "Committee member"] as const,
    ),
  );
  const sentByInvitation = new Map(
    ((sends ?? []) as Array<{ invitation_id: string; sent_at: string; marked_by_label: string | null }>).map(
      (s) => [s.invitation_id, s] as const,
    ),
  );

  const byInvitation = new Map<string, ZoomAttendeeRow>();
  for (const row of (rsvpRows ?? []) as Array<{
    invitation_id: string;
    status: string;
    invitations: { id: string; guest_name: string | null; guest_phone: string | null; inviter_id: string | null } | null;
  }>) {
    const invitation = row.invitations;
    if (!invitation) continue;
    const phone = phoneTail((invitation.guest_phone ?? "").trim()) ? (invitation.guest_phone ?? "").trim() : "";
    const sent = sentByInvitation.get(invitation.id) ?? null;
    // One row per invitation; a "yes" always wins over "maybe" if both exist.
    const existing = byInvitation.get(invitation.id);
    if (existing && existing.status === "yes") continue;
    byInvitation.set(invitation.id, {
      invitationId: invitation.id,
      name: (invitation.guest_name ?? "").trim() || "Guest",
      phone,
      hasPhone: phone.length > 0,
      status: row.status,
      inviterName: invitation.inviter_id
        ? inviterNameById.get(invitation.inviter_id) ?? "Committee member"
        : "Unassigned",
      sentAt: sent?.sent_at ?? null,
      markedByLabel: sent?.marked_by_label ?? null,
    });
  }

  const rows = [...byInvitation.values()].sort((a, b) => {
    // Not-yet-texted first, then alphabetical.
    const aSent = a.sentAt ? 1 : 0;
    const bSent = b.sentAt ? 1 : 0;
    if (aSent !== bSent) return aSent - bSent;
    return a.name.localeCompare(b.name);
  });

  return {
    rows,
    totals: {
      total: rows.length,
      sent: rows.filter((r) => r.sentAt).length,
      toSend: rows.filter((r) => !r.sentAt).length,
      noPhone: rows.filter((r) => !r.hasPhone).length,
    },
    body: ZOOM_TEXT_BODY,
    generated_at: new Date().toISOString(),
  };
}

export async function markZoomTextSent(
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
      .from("zoom_text_sends")
      .delete()
      .eq("invitation_id", input.invitationId);
    if (error) throw new Error(error.message);
    return { ok: true, sentAt: null };
  }

  const sentAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("zoom_text_sends")
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
  if (!data) throw new Error("The Zoom text mark could not be verified");
  return { ok: true, sentAt: data.sent_at as string };
}
