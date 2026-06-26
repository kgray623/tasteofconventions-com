import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  ext: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9]+$/, "Invalid extension"),
});

export const createEntertainmentUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${crypto.randomUUID()}.${data.ext.toLowerCase()}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("entertainment-videos")
      .createSignedUploadUrl(path);
    if (error || !signed) {
      console.error("[entertainment-upload] signed url error:", error?.message);
      throw new Error("Could not start upload. Please try again.");
    }
    return { path: signed.path, token: signed.token };
  });
