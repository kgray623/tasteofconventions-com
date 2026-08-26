import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type { ZoomAttendeeRow, ZoomTextsResult } from "@/lib/zoom-texts.server";

/** Zoom yes/maybe attendees with their Zoom-link text sent status. */
export const getZoomTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadZoomTexts } = await import("@/lib/zoom-texts.server");
    return loadZoomTexts(context.supabase, context.userId);
  });

/** Manual "I sent that text" mark — only ever set by an explicit human action. */
export const setZoomTextSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ invitationId: z.string().uuid(), sent: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { markZoomTextSent } = await import("@/lib/zoom-texts.server");
    return markZoomTextSent(context.supabase, context.userId, data);
  });
