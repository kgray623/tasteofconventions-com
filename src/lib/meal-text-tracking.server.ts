import { normalizeCuisine, parseSelections } from "@/lib/preorder-math";

export type MealTextCampaign = "original" | "payment_update";

export async function assertMealStaff(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "team"]);
  if (error || !data?.length) throw new Error("Forbidden");
}

export async function appendMealTextEvents(
  supabaseAdmin: any,
  input: {
    campaign: MealTextCampaign;
    marks: Array<{ preorderId: string; cuisine: string }>;
    sent: boolean;
    actorId: string;
  },
) {
  const preorderIds = [...new Set(input.marks.map((mark) => mark.preorderId))];
  const { data: preorders, error: preorderError } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("id,selections")
    .in("id", preorderIds);
  if (preorderError) throw new Error(preorderError.message);

  const activeByPreorder = new Map<string, Set<string>>();
  for (const preorder of preorders ?? []) {
    activeByPreorder.set(
      preorder.id,
      new Set(parseSelections(preorder.selections).map((selection) => selection.cuisine)),
    );
  }
  for (const mark of input.marks) {
    const cuisine = normalizeCuisine(mark.cuisine);
    if (!activeByPreorder.get(mark.preorderId)?.has(cuisine)) {
      throw new Error("This text mark does not match a current meal order");
    }
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("meal_text_events")
    .select("preorder_id,cuisine,action,event_at,created_at")
    .eq("campaign", input.campaign)
    .in("preorder_id", preorderIds)
    .order("event_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (existingError) throw new Error(existingError.message);

  const latest = new Map<string, string>();
  for (const event of existing ?? []) {
    const key = `${event.preorder_id}::${normalizeCuisine(event.cuisine)}`;
    if (!latest.has(key)) latest.set(key, event.action);
  }

  const action = input.sent ? "sent" : "reversed";
  const rows = input.marks.map((mark) => ({
    campaign: input.campaign,
    action,
    preorder_id: mark.preorderId,
    cuisine: normalizeCuisine(mark.cuisine),
    actor_id: input.actorId,
    event_at: new Date().toISOString(),
    evidence_source: "human_action",
  }));
  for (const row of rows) {
    const key = `${row.preorder_id}::${row.cuisine}`;
    if (latest.get(key) === action) {
      throw new Error(input.sent ? "This text is already marked sent" : "This text is already reversed");
    }
  }

  const { error } = await supabaseAdmin.from("meal_text_events").insert(rows);
  if (error) throw new Error(error.message);
  return { ok: true, sentAt: input.sent ? rows[0]?.event_at ?? null : null };
}