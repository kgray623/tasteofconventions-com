// Server-only helper for the Burmese payment-proof recheck texting screen.
//
// Read-only over invitations/inviters: the roster itself is the fixed list the
// restaurant owner supplied. Sent marks live in burmese_recheck_text_sends and
// are written ONLY by an explicit human tap on the page.
import { phoneTail } from "@/lib/phone";
import {
  BURMESE_RECHECK_ROSTER,
  BURMESE_RECHECK_TEMPLATE_KEY,
  DEFAULT_BURMESE_RECHECK_TEMPLATE,
} from "@/lib/burmese-recheck-roster";

export type BurmeseRecheckGuest = {
  phone: string;
  phoneNormalized: string;
  name: string;
  invitationId: string | null;
  sentAt: string | null;
  markedByLabel: string | null;
};

export type BurmeseRecheckGroup = {
  inviterId: string | null;
  inviterName: string;
  guests: BurmeseRecheckGuest[];
  sent: number;
};

export type BurmeseRecheckResult = {
  groups: BurmeseRecheckGroup[];
  totals: { guests: number; members: number; sent: number; toSend: number };
  template: string;
  isAdmin: boolean;
  generated_at: string;
};

function normalizePhone(raw: string) {
  const tail = phoneTail(raw);
  return tail || (raw ?? "").replace(/\D/g, "");
}

export async function loadBurmeseRecheckList(
  supabase: any,
  userId: string,
): Promise<BurmeseRecheckResult> {
  const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
  const identity = await assertMealStaff(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: invitations }, { data: inviterRows }, { data: setting }, { data: sends }] =
    await Promise.all([
      supabaseAdmin.from("invitations").select("id,guest_name,guest_phone,inviter_id"),
      supabaseAdmin.from("inviters").select("id,name"),
      supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", BURMESE_RECHECK_TEMPLATE_KEY)
        .maybeSingle(),
      supabaseAdmin
        .from("burmese_recheck_text_sends")
        .select("phone_normalized,sent_at,marked_by_label"),
    ]);

  const template = (setting?.value as string | undefined) ?? DEFAULT_BURMESE_RECHECK_TEMPLATE;
  const inviterNameById = new Map(
    ((inviterRows ?? []) as Array<{ id: string; name: string | null }>).map(
      (r) => [r.id, (r.name ?? "").trim() || "Committee member"] as const,
    ),
  );
  const sentByPhone = new Map(
    (
      (sends ?? []) as Array<{
        phone_normalized: string;
        sent_at: string;
        marked_by_label: string | null;
      }>
    ).map((s) => [s.phone_normalized, s] as const),
  );

  const invitationByTail = new Map<
    string,
    { id: string; guest_name: string | null; inviter_id: string | null }
  >();
  for (const inv of (invitations ?? []) as Array<{
    id: string;
    guest_name: string | null;
    guest_phone: string | null;
    inviter_id: string | null;
  }>) {
    const tail = phoneTail(inv.guest_phone);
    if (tail.length >= 7 && !invitationByTail.has(tail)) {
      invitationByTail.set(tail, {
        id: inv.id,
        guest_name: inv.guest_name,
        inviter_id: inv.inviter_id,
      });
    }
  }

  const groupMap = new Map<string, BurmeseRecheckGroup>();
  for (const entry of BURMESE_RECHECK_ROSTER) {
    const normalized = normalizePhone(entry.phone);
    const match = invitationByTail.get(normalized) ?? null;
    const sent = sentByPhone.get(normalized) ?? null;
    const key = match?.inviter_id ?? "__none__";
    const group =
      groupMap.get(key) ??
      ({
        inviterId: match?.inviter_id ?? null,
        inviterName: match?.inviter_id
          ? (inviterNameById.get(match.inviter_id) ?? "Committee member")
          : "No committee member recorded",
        guests: [],
        sent: 0,
      } as BurmeseRecheckGroup);
    group.guests.push({
      phone: entry.phone,
      phoneNormalized: normalized,
      // The roster name the restaurant owner gave us always wins on screen.
      name: entry.name,
      invitationId: match?.id ?? null,
      sentAt: sent?.sent_at ?? null,
      markedByLabel: sent?.marked_by_label ?? null,
    });
    if (sent) group.sent += 1;
    groupMap.set(key, group);
  }

  const groups = Array.from(groupMap.values())
    .map((g) => ({
      ...g,
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

  return {
    groups,
    totals: {
      guests: groups.reduce((sum, g) => sum + g.guests.length, 0),
      members: groups.length,
      sent: groups.reduce((sum, g) => sum + g.sent, 0),
      toSend: groups.reduce((sum, g) => sum + g.guests.filter((x) => !x.sentAt).length, 0),
    },
    template,
    isAdmin: Boolean((identity as any)?.isAdmin ?? false),
    generated_at: new Date().toISOString(),
  };
}

/** Manual "I sent that recheck text" mark — only ever set by a human tap. */
export async function markBurmeseRecheckTextSent(
  supabase: any,
  userId: string,
  input: { phoneNormalized: string; guestName?: string; invitationId?: string | null; sent: boolean },
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
      .from("burmese_recheck_text_sends")
      .delete()
      .eq("phone_normalized", input.phoneNormalized);
    if (error) throw new Error(error.message);
    return { ok: true, sentAt: null };
  }

  const sentAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("burmese_recheck_text_sends")
    .upsert(
      {
        phone_normalized: input.phoneNormalized,
        guest_name: input.guestName ?? null,
        invitation_id: input.invitationId ?? null,
        sent_at: sentAt,
        marked_by: userId,
        marked_by_label: label,
        updated_at: sentAt,
      },
      { onConflict: "phone_normalized" },
    )
    .select("phone_normalized,sent_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The recheck text mark could not be verified");
  return { ok: true, sentAt: data.sent_at as string };
}
