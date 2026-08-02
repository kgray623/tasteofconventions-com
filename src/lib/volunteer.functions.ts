import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveVolunteerName, isAdminUser } from "@/lib/volunteer.server";

export type VolunteerCategory = {
  id: string;
  name: string;
  description: string | null;
  volunteer_count: number;
  mine: boolean;
  my_assignment_id: string | null;
};

/** Every category plus the caller's own sign-up state and a headcount. */
export const listVolunteerCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VolunteerCategory[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: cats }, { data: assigns }] = await Promise.all([
      supabaseAdmin.from("categories").select("id,name,description,sort_order").order("sort_order"),
      supabaseAdmin.from("category_assignments").select("id,category_id,user_id"),
    ]);
    const rows = assigns ?? [];
    return (cats ?? []).map((c) => {
      const mine = rows.find((a) => a.category_id === c.id && a.user_id === context.userId);
      return {
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        volunteer_count: rows.filter((a) => a.category_id === c.id).length,
        mine: !!mine,
        my_assignment_id: mine?.id ?? null,
      };
    });
  });

/** Sign the caller up. The name is resolved server-side, never sent by the browser. */
export const volunteerSignUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { categoryId: string }) => {
    if (!data?.categoryId || typeof data.categoryId !== "string") {
      throw new Error("Missing category.");
    }
    return { categoryId: data.categoryId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id,name")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (!cat) throw new Error("That volunteer role no longer exists.");

    const { data: existing } = await supabaseAdmin
      .from("category_assignments")
      .select("id")
      .eq("category_id", data.categoryId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: true, alreadySignedUp: true, assignmentId: existing.id };

    const volunteerName = await resolveVolunteerName(context.userId);
    const { data: inserted, error } = await supabaseAdmin
      .from("category_assignments")
      .insert({
        category_id: data.categoryId,
        user_id: context.userId,
        volunteer_name: volunteerName,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, alreadySignedUp: false, assignmentId: inserted.id };
  });

/** Remove the caller's own sign-up (admins may remove anyone's). */
export const volunteerWithdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { assignmentId: string }) => {
    if (!data?.assignmentId || typeof data.assignmentId !== "string") {
      throw new Error("Missing assignment.");
    }
    return { assignmentId: data.assignmentId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("category_assignments")
      .select("id,user_id")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (!row) return { ok: true };
    const admin = await isAdminUser(context.supabase, context.userId);
    if (row.user_id !== context.userId && !admin) throw new Error("Not allowed.");
    const { error } = await supabaseAdmin
      .from("category_assignments")
      .delete()
      .eq("id", data.assignmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The caller's own volunteer roles (works for guests too). */
export const listMyVolunteerRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: assigns } = await supabaseAdmin
      .from("category_assignments")
      .select("id,category_id")
      .eq("user_id", context.userId);
    const ids = Array.from(new Set((assigns ?? []).map((a) => a.category_id)));
    if (!ids.length) return [] as { id: string; name: string; description: string | null }[];
    const { data: cats } = await supabaseAdmin
      .from("categories")
      .select("id,name,description,sort_order")
      .in("id", ids)
      .order("sort_order");
    return (cats ?? []).map((c) => ({ id: c.id, name: c.name, description: c.description ?? null }));
  });
