// Server-only helpers for committee follow-up notes on unpaid meals.

export type MealFollowUpNoteInput = {
  preorder_id: string;
  cuisine: string;
  invitation_id: string | null;
  note: string;
};

export type MealFollowUpNote = {
  id: string;
  preorder_id: string;
  cuisine: string;
  invitation_id: string | null;
  note: string;
  created_by_label: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Load every follow-up note. RLS already restricts to admin/team, but this
 * uses the admin client so the caller shape matches other meal-payment helpers.
 */
export async function listMealFollowUpNotes(supabaseAdmin: any): Promise<MealFollowUpNote[]> {
  const { data, error } = await supabaseAdmin
    .from("meal_follow_up_notes")
    .select("id,preorder_id,cuisine,invitation_id,note,created_by_label,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    preorder_id: r.preorder_id as string,
    cuisine: r.cuisine as string,
    invitation_id: (r.invitation_id ?? null) as string | null,
    note: (r.note ?? "") as string,
    created_by_label: (r.created_by_label ?? null) as string | null,
    created_at: (r.created_at ?? null) as string,
    updated_at: (r.updated_at ?? null) as string,
  }));
}

/**
 * Upsert a single note per preorder + cuisine. A note never marks a guest paid
 * and never hides them from the unpaid list; it is purely presentational.
 */
export async function saveMealFollowUpNote(
  supabaseAdmin: any,
  input: MealFollowUpNoteInput,
  actor: { user_id: string; label: string | null },
): Promise<MealFollowUpNote> {
  const note = (input.note ?? "").trim().slice(0, 500);
  if (!note) throw new Error("Note cannot be empty.");

  const payload = {
    preorder_id: input.preorder_id,
    cuisine: input.cuisine,
    invitation_id: input.invitation_id,
    note,
    created_by: actor.user_id,
    created_by_label: actor.label?.slice(0, 120) ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("meal_follow_up_notes")
    .upsert(payload, { onConflict: "preorder_id,cuisine", ignoreDuplicates: false })
    .select("id,preorder_id,cuisine,invitation_id,note,created_by_label,created_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The note did not save.");

  return {
    id: data.id as string,
    preorder_id: data.preorder_id as string,
    cuisine: data.cuisine as string,
    invitation_id: (data.invitation_id ?? null) as string | null,
    note: (data.note ?? "") as string,
    created_by_label: (data.created_by_label ?? null) as string | null,
    created_at: (data.created_at ?? null) as string,
    updated_at: (data.updated_at ?? null) as string,
  };
}
