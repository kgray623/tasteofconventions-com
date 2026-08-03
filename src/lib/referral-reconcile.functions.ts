import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Referral list reconciliation.
 *
 * Purpose: a committee member hands in a list (screenshots or typed lines).
 * Every line must end up with exactly ONE verifiable outcome:
 *
 *   - "owned"     → already credited to this committee member
 *   - "duplicate" → in the system but an EARLIER referrer owns it (First-Loaded Wins)
 *   - "unowned"   → in the system with no referral owner at all (safe to claim)
 *   - "missing"   → not in the system in any form (safe to add)
 *
 * Matching order is phone last-10 first (authoritative), then normalized full
 * name, then first+last token. Nothing is ever moved away from an existing
 * owner; the only writes are (a) claiming unowned rows, (b) inserting missing
 * rows, (c) recording duplicates so they stay visible to the submitter.
 */

const lineSchema = z.object({
  name: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(50).default(""),
});

const reconcileInput = z.object({
  inviterId: z.string().uuid(),
  lines: z.array(lineSchema).min(1).max(400),
});

export type ReconcileOutcome = "owned" | "duplicate" | "unowned" | "missing";

export type ReconcileRow = {
  index: number;
  name: string;
  phone: string;
  outcome: ReconcileOutcome;
  matchedBy: "phone" | "name" | "fuzzy" | null;
  invitationId: string | null;
  matchedName: string | null;
  matchedPhone: string | null;
  ownerInviterId: string | null;
  ownerName: string | null;
  ownerCreatedAt: string | null;
  rsvpStatus: string | null;
  partySize: number | null;
  people: number;
};

export type ReconcileResult = {
  inviterId: string;
  inviterName: string;
  eventId: string;
  rows: ReconcileRow[];
  summary: {
    lines: number;
    owned: number;
    duplicate: number;
    unowned: number;
    missing: number;
    ownedPeople: number;
    submittedPeople: number;
    currentlyCredited: number;
  };
};

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
const tail = (v: string | null | undefined) => digits(v).slice(-10);

const normName = (v: string | null | undefined) =>
  (v ?? "")
    .toLowerCase()
    .replace(/^(sister|sis|sr|brother|bro|br|elder|pastor|pr|dr|mr|mrs|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const nameKey = (v: string | null | undefined) => {
  const t = normName(v).split(" ").filter(Boolean);
  if (t.length < 2) return "";
  return `${t[0]}|${t[t.length - 1]}`;
};

/** How many people a household line represents (couples / families count > 1). */
export const headCount = (name: string): number => {
  const n = (name ?? "").trim();
  if (!n) return 1;
  const parts = n
    .split(/\s*(?:&| and |\/|\+|,)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  let heads = Math.max(1, parts.length);
  if (/\b(sons?|daughters?|kids|children|family)\b/i.test(n)) heads += 1;
  return heads;
};

async function requireStaff(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Couldn't verify your access. Please sign in again.");
  const roles = new Set((data ?? []).map((r: { role: string }) => r.role));
  if (!roles.has("admin") && !roles.has("team")) {
    throw new Error("Only admins and committee members can reconcile lists.");
  }
  return { isAdmin: roles.has("admin") };
}

export const reconcileReferralList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reconcileInput.parse(d))
  .handler(async ({ data, context }): Promise<ReconcileResult> => {
    const { supabase, userId } = context;
    await requireStaff(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inviter, error: invErr } = await supabaseAdmin
      .from("inviters")
      .select("id,name")
      .eq("id", data.inviterId)
      .maybeSingle();
    if (invErr || !inviter) throw new Error("That committee member wasn't found.");

    const { data: eventRow } = await supabaseAdmin
      .from("events")
      .select("id")
      .order("starts_at")
      .limit(1)
      .maybeSingle();
    const eventId = eventRow?.id ?? "";

    const { data: invitations, error: listErr } = await supabaseAdmin
      .from("invitations")
      .select("id,guest_name,guest_phone,inviter_id,created_at")
      .order("created_at", { ascending: true });
    if (listErr) throw new Error("Couldn't read the guest list.");

    const { data: inviterRows } = await supabaseAdmin.from("inviters").select("id,name");
    const inviterNames = new Map<string, string>(
      (inviterRows ?? []).map((r) => [r.id as string, r.name as string]),
    );

    const ids = (invitations ?? []).map((r) => r.id as string);
    const rsvpByInvitation = new Map<string, { status: string; party_size: number | null }>();
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { data: rsvps } = await supabaseAdmin
        .from("rsvps")
        .select("invitation_id,status,party_size,created_at")
        .in("invitation_id", chunk)
        .order("created_at", { ascending: true });
      for (const r of rsvps ?? []) {
        rsvpByInvitation.set(r.invitation_id as string, {
          status: r.status as string,
          party_size: (r.party_size as number | null) ?? null,
        });
      }
    }

    const byPhone = new Map<string, any>();
    const byName = new Map<string, any>();
    const byFuzzy = new Map<string, any>();
    for (const row of invitations ?? []) {
      const t = tail(row.guest_phone as string | null);
      if (t.length >= 10 && !byPhone.has(t)) byPhone.set(t, row);
      const n = normName(row.guest_name as string);
      if (n && !byName.has(n)) byName.set(n, row);
      const k = nameKey(row.guest_name as string);
      if (k && !byFuzzy.has(k)) byFuzzy.set(k, row);
    }

    const rows: ReconcileRow[] = data.lines.map((line, index) => {
      const name = line.name.trim();
      const phone = line.phone.trim();
      let match: any = null;
      let matchedBy: ReconcileRow["matchedBy"] = null;

      const t = tail(phone);
      if (t.length >= 10 && byPhone.has(t)) {
        match = byPhone.get(t);
        matchedBy = "phone";
      }
      if (!match && name) {
        const n = normName(name);
        if (byName.has(n)) {
          match = byName.get(n);
          matchedBy = "name";
        } else {
          const k = nameKey(name);
          if (k && byFuzzy.has(k)) {
            match = byFuzzy.get(k);
            matchedBy = "fuzzy";
          }
        }
      }

      const people = headCount(name || (match?.guest_name as string) || "");

      if (!match) {
        return {
          index,
          name,
          phone,
          outcome: "missing",
          matchedBy: null,
          invitationId: null,
          matchedName: null,
          matchedPhone: null,
          ownerInviterId: null,
          ownerName: null,
          ownerCreatedAt: null,
          rsvpStatus: null,
          partySize: null,
          people,
        };
      }

      const ownerId = (match.inviter_id as string | null) ?? null;
      const rsvp = rsvpByInvitation.get(match.id as string) ?? null;
      const outcome: ReconcileOutcome =
        ownerId === data.inviterId ? "owned" : ownerId ? "duplicate" : "unowned";

      return {
        index,
        name,
        phone,
        outcome,
        matchedBy,
        invitationId: match.id as string,
        matchedName: match.guest_name as string,
        matchedPhone: (match.guest_phone as string | null) ?? null,
        ownerInviterId: ownerId,
        ownerName: ownerId ? (inviterNames.get(ownerId) ?? "another committee member") : null,
        ownerCreatedAt: (match.created_at as string) ?? null,
        rsvpStatus: rsvp?.status ?? null,
        partySize: rsvp?.party_size ?? null,
        people,
      };
    });

    const currentlyCredited = (invitations ?? []).filter(
      (r) => r.inviter_id === data.inviterId,
    ).length;

    const count = (o: ReconcileOutcome) => rows.filter((r) => r.outcome === o).length;
    const ownedPeople = rows
      .filter((r) => r.outcome === "owned")
      .reduce((sum, r) => sum + (r.partySize && r.partySize > 0 ? r.partySize : r.people), 0);

    return {
      inviterId: data.inviterId,
      inviterName: inviter.name as string,
      eventId,
      rows,
      summary: {
        lines: rows.length,
        owned: count("owned"),
        duplicate: count("duplicate"),
        unowned: count("unowned"),
        missing: count("missing"),
        ownedPeople,
        submittedPeople: rows.reduce(
          (sum, r) => sum + (r.partySize && r.partySize > 0 ? r.partySize : r.people),
          0,
        ),
        currentlyCredited,
      },
    };
  });

const commitInput = z.object({
  inviterId: z.string().uuid(),
  eventId: z.string().uuid(),
  claimUnownedIds: z.array(z.string().uuid()).max(400).default([]),
  addMissing: z.array(lineSchema).max(400).default([]),
  recordDuplicates: z
    .array(z.object({ invitationId: z.string().uuid(), ownerInviterId: z.string().uuid().nullable() }))
    .max(400)
    .default([]),
});

export type CommitReconcileResult = {
  claimed: number;
  added: number;
  duplicatesRecorded: number;
  failures: Array<{ name: string; message: string }>;
};

export const commitReferralReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => commitInput.parse(d))
  .handler(async ({ data, context }): Promise<CommitReconcileResult> => {
    const { supabase, userId } = context;
    const { isAdmin } = await requireStaff(supabase, userId);
    if (!isAdmin) throw new Error("Only an admin can apply a reconciliation.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const failures: CommitReconcileResult["failures"] = [];

    const { data: inviter } = await supabaseAdmin
      .from("inviters")
      .select("id,name,host_id")
      .eq("id", data.inviterId)
      .maybeSingle();
    if (!inviter) throw new Error("That committee member wasn't found.");
    const hostId = (inviter.host_id as string | null) ?? userId;

    // 1. Claim rows that had NO owner. Never touches rows owned by someone else.
    let claimed = 0;
    if (data.claimUnownedIds.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from("invitations")
        .update({ inviter_id: data.inviterId })
        .in("id", data.claimUnownedIds)
        .is("inviter_id", null)
        .select("id");
      if (error) failures.push({ name: "claim unowned", message: error.message });
      claimed = (updated ?? []).length;
    }

    // 2. Insert genuinely missing lines, credited to this committee member.
    let added = 0;
    for (const line of data.addMissing) {
      const name = line.name.trim();
      if (!name) continue;
      const { error } = await supabaseAdmin.from("invitations").insert({
        event_id: data.eventId,
        host_id: hostId,
        guest_name: name,
        guest_phone: line.phone.trim() || null,
        inviter_id: data.inviterId,
        notes: `Added from ${inviter.name}'s submitted list (reconciliation)`,
      });
      if (error) failures.push({ name, message: error.message });
      else added += 1;
    }

    // 3. Record overlaps so the submitter can still see them (First-Loaded Wins).
    let duplicatesRecorded = 0;
    if (data.recordDuplicates.length > 0) {
      const payload = data.recordDuplicates.map((d) => ({
        invitation_id: d.invitationId,
        claimed_by_inviter_id: data.inviterId,
        owner_inviter_id: d.ownerInviterId,
        source_note: `${inviter.name} submitted list — first-loaded owner keeps credit`,
      }));
      const { data: ins, error } = await supabaseAdmin
        .from("referral_duplicates")
        .upsert(payload, { onConflict: "invitation_id,claimed_by_inviter_id" })
        .select("id");
      if (error) failures.push({ name: "duplicates", message: error.message });
      duplicatesRecorded = (ins ?? []).length;
    }

    return { claimed, added, duplicatesRecorded, failures };
  });
