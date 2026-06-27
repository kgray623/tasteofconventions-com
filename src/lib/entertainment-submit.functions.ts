import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  talent: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  video_path: z
    .string()
    .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[A-Za-z0-9]+$/),
});

export const submitEntertainment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("entertainment_submissions").insert({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      talent: data.talent || null,
      notes: data.notes || null,
      video_path: data.video_path,
    });
    if (error) {
      console.error("[entertainment-submit] insert error:", error.message);
      throw new Error("Could not save submission. Please try again.");
    }
    return { ok: true };
  });
