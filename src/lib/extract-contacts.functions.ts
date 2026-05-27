import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  // Data URLs like "data:image/png;base64,...."
  images: z.array(z.string().min(20).max(15_000_000)).min(1).max(10),
});

type ExtractedContact = { name: string; phone: string; email: string };

export const extractContactsFromImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ contacts: ExtractedContact[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const userContent: Array<
      { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text:
          "These are screenshots of a contact list (phone contacts, messages, social profiles, or written invite lists). Extract every distinct person. Return ONLY JSON via the provided tool. Use empty strings when a field is unknown. Keep phone numbers as shown but stripped of obvious labels. Do not invent data.",
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
        messages: [{ role: "user", content: userContent }],
        tools: [
          {
            type: "function",
            function: {
              name: "save_contacts",
              description: "Save the list of contacts found in the images.",
              parameters: {
                type: "object",
                properties: {
                  contacts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        phone: { type: "string" },
                        email: { type: "string" },
                      },
                      required: ["name", "phone", "email"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["contacts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_contacts" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit hit — please wait a moment and try again.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits in your workspace.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (!argsStr) return { contacts: [] };
    let parsed: { contacts?: ExtractedContact[] };
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return { contacts: [] };
    }
    const contacts = (parsed.contacts ?? [])
      .map((c) => ({
        name: String(c?.name ?? "").trim(),
        phone: String(c?.phone ?? "").trim(),
        email: String(c?.email ?? "").trim(),
      }))
      .filter((c) => c.name || c.phone || c.email);
    return { contacts };
  });
