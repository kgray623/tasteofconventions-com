import type { MealCommunicationRow } from "@/lib/meal-communication";

export type CommitteeTextRosterRow = {
  id: string;
  name: string;
  phone: string;
  sent: boolean;
  sent_at: string | null;
  sent_by: string | null;
  active_contacts: number;
  outstanding_lines: number;
  contacts: Array<{
    id: string;
    name: string;
    phone: string;
    cuisine: string;
    qty: number;
    status: "paid" | "confirmed" | "unverified" | "disputed" | "needs";
  }>;
};

export async function loadCommitteeTextRoster(
  supabaseAdmin: any,
  ledgerRows: MealCommunicationRow[],
  evidenceLines: Array<{
    preorder_id: string;
    cuisine: string;
    decision: "confirmed" | "disputed" | null;
  }>,
) {
  const [{ data: inviters, error: inviterError }, { data: events, error: eventError }] = await Promise.all([
    supabaseAdmin.from("inviters").select("id,name,phone").eq("active", true).order("name"),
    supabaseAdmin
      .from("committee_text_events")
      .select("inviter_id,action,actor_label,event_at,created_at")
      .order("event_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (inviterError) throw new Error(inviterError.message);
  if (eventError) throw new Error(eventError.message);

  const latestEvent = new Map<string, any>();
  for (const event of events ?? []) {
    if (!latestEvent.has(event.inviter_id)) latestEvent.set(event.inviter_id, event);
  }
  const evidence = new Map(
    evidenceLines.map((line) => [`${line.preorder_id}::${line.cuisine}`, line.decision] as const),
  );
  const rowsByInviter = new Map<string, MealCommunicationRow[]>();
  for (const row of ledgerRows) {
    if (!row.inviter_id) continue;
    const current = rowsByInviter.get(row.inviter_id) ?? [];
    current.push(row);
    rowsByInviter.set(row.inviter_id, current);
  }

  const roster: CommitteeTextRosterRow[] = (inviters ?? []).map((inviter: any) => {
    const orders = rowsByInviter.get(inviter.id) ?? [];
    const event = latestEvent.get(inviter.id);
    const contacts = orders.map((row) => {
      const decision = evidence.get(`${row.id}::${row.cuisine}`);
      const paid = row.state === "paid_confirmed" || row.state === "paid_reported";
      const status = paid
        ? "paid" as const
        : decision === "confirmed"
          ? "confirmed" as const
          : decision === "disputed"
            ? "disputed" as const
            : row.update_sent_at
              ? "unverified" as const
              : "needs" as const;
      return { id: row.id, name: row.name, phone: row.phone, cuisine: row.cuisine, qty: row.qty, status };
    });
    return {
      id: inviter.id as string,
      name: (inviter.name as string)?.trim() || "Committee member",
      phone: (inviter.phone as string | null)?.trim() || "",
      sent: event?.action === "sent",
      sent_at: event?.action === "sent" ? event.event_at : null,
      sent_by: event?.action === "sent" ? event.actor_label : null,
      active_contacts: new Set(orders.map((row) => row.id)).size,
      outstanding_lines: contacts.filter((contact) => contact.status === "needs" || contact.status === "unverified" || contact.status === "disputed").length,
      contacts,
    };
  });

  return {
    rows: roster,
    totals: {
      active_members: roster.length,
      sent: roster.filter((row) => row.sent).length,
      pending: roster.filter((row) => !row.sent).length,
      missing_phone: roster.filter((row) => !row.phone).length,
    },
  };
}

export async function appendCommitteeTextEvent(
  supabaseAdmin: any,
  input: { inviterId: string; sent: boolean; actorId: string; actorLabel: string },
) {
  const { data: inviter, error: inviterError } = await supabaseAdmin
    .from("inviters")
    .select("id,active")
    .eq("id", input.inviterId)
    .maybeSingle();
  if (inviterError) throw new Error(inviterError.message);
  if (!inviter?.active) throw new Error("This committee member is not active");

  const { data: latest, error: latestError } = await supabaseAdmin
    .from("committee_text_events")
    .select("action")
    .eq("inviter_id", input.inviterId)
    .order("event_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  if (latestError) throw new Error(latestError.message);
  const action = input.sent ? "sent" : "reversed";
  if (latest?.[0]?.action === action) throw new Error(input.sent ? "This committee text is already confirmed" : "This committee text is already reversed");

  const eventAt = new Date().toISOString();
  const { data: inserted, error } = await supabaseAdmin
    .from("committee_text_events")
    .insert({
      inviter_id: input.inviterId,
      action,
      actor_id: input.actorId,
      actor_label: input.actorLabel,
      event_at: eventAt,
    })
    .select("id,inviter_id,action,actor_id,actor_label,event_at")
    .single();
  if (error) throw new Error(error.message);
  if (!inserted || inserted.inviter_id !== input.inviterId || inserted.action !== action || inserted.actor_id !== input.actorId) {
    throw new Error("The committee text history write could not be verified");
  }
  return { ok: true, event: inserted };
}