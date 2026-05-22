import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  images: z
    .array(
      z
        .string()
        .min(20)
        .max(15_000_000)
        .regex(/^data:image\/(png|jpe?g|webp|heic|heif|gif);base64,/i, "Must be a data: image URL"),
    )
    .min(1)
    .max(8),
});

const ContactSchema = z.object({
  name: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(60).default(""),
  email: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(500).default(""),
});

type Contact = z.infer<typeof ContactSchema>;

const SYSTEM_PROMPT = `You extract contact information from screenshots of phone Contacts apps, Messages apps, business cards, or address books.

Return ONLY a JSON object: {"contacts": [{"name": "...", "phone": "...", "email": "...", "notes": "..."}]}

Rules:
- Extract every distinct person visible. If the screenshot shows one contact, return one entry.
- Use the full display name. Strip leading category prefixes like "NE ", "WORK ", "HOME ".
- Preserve phone numbers exactly as shown (keep + and country code).
- If a field is not visible, use an empty string.
- Skip UI labels like "Call", "Message", "Video", "Email", "Mobile", "Default".
- Do not invent data. No commentary, no markdown fences, just the JSON object.`;

export const extractContactsFromImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<{ contacts: Contact[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI is not configured on this project.");
    }

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: "Extract every contact from these screenshots. Return strict JSON only.",
      },
      ...data.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      throw new Error("AI rate limit reached. Please wait a moment and try again.");
    }
    if (res.status === 402) {
      throw new Error("AI credits exhausted. Add credits in Lovable Cloud settings.");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[contact-ocr] gateway error", res.status, body.slice(0, 400));
      throw new Error("AI extraction failed. Please try a clearer screenshot.");
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { contacts: [] };
    }

    const list =
      parsed && typeof parsed === "object" && "contacts" in parsed
        ? (parsed as { contacts: unknown }).contacts
        : Array.isArray(parsed)
          ? parsed
          : [];

    const contacts: Contact[] = (Array.isArray(list) ? list : [])
      .map((item) => {
        const safe = ContactSchema.safeParse(item);
        return safe.success ? safe.data : null;
      })
      .filter((c): c is Contact => !!c && (!!c.name || !!c.phone || !!c.email));

    return { contacts };
  });
