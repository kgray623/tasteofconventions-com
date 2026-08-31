import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type {
  AlbumTextGuest,
  AlbumTextGroup,
  AlbumTextResult,
} from "@/lib/album-texts.server";

/** Guests who attended (in person or Zoom), grouped by committee member. */
export const getAlbumTextList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadAlbumTextList } = await import("@/lib/album-texts.server");
    return loadAlbumTextList(context.supabase, context.userId);
  });

/** Save the album announcement wording (admin/committee only). */
export const saveAlbumTextTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ template: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertMealStaff } = await import("@/lib/meal-text-tracking.server");
    await assertMealStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: "album_text_template",
        value: data.template,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Manual "I sent that text" mark — only ever set by an explicit human action. */
export const setAlbumTextSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ invitationId: z.string().uuid(), sent: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { markAlbumTextSent } = await import("@/lib/album-texts.server");
    return markAlbumTextSent(context.supabase, context.userId, data);
  });
