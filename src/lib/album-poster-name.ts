import { supabase } from "@/integrations/supabase/client";

/**
 * The display label for something the signed-in person posts in the shared
 * album (upload, video link, comment, like). It must be the signed-in person's
 * own name, never the guest name of whatever invitation page the album happens
 * to be rendered on.
 */
export async function resolveAlbumPosterName(
  userId: string,
  fallbackName?: string | null,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const name = (profile?.display_name ?? "").trim();
  if (name) return name;
  return (fallbackName ?? "").trim() || "Guest";
}
