import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveAlbumPosterName } from "@/lib/album-poster-name";


export type PhotoLike = {
  id: string;
  photo_id: string;
  user_id: string;
  liker_name: string;
};

/**
 * Heart / like toggle for one shared album item (photo or video).
 * One like per person per item, enforced by a unique index in the database.
 */
export function PhotoLikes({
  photoId,
  likes,
  myUserId,
  guestName,
  onChanged,
}: {
  photoId: string;
  likes: PhotoLike[];
  myUserId: string | null;
  guestName?: string | null;
  onChanged: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const mine = myUserId ? likes.find((l) => l.user_id === myUserId) : undefined;
  const liked = Boolean(mine);

  const toggle = async () => {
    if (busy) return;
    if (!myUserId) {
      toast.error("Sign in with your last name and phone number to like photos.");
      return;
    }
    setBusy(true);
    try {
      if (mine) {
        const { error } = await supabase.from("photo_likes").delete().eq("id", mine.id);
        if (error) {
          toast.error("Could not remove your like.");
          return;
        }
      } else {
        // Label the like with the signed-in person, not the guest name of the
        // invitation page this album is rendered on.
        const likerName = await resolveAlbumPosterName(myUserId);
        const { error } = await supabase.from("photo_likes").insert({
          photo_id: photoId,
          user_id: myUserId,
          liker_name: likerName,
        });

        if (error) {
          toast.error("Could not save your like.");
          return;
        }
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? "Remove my like" : "Like this"}
      data-testid={`like-${photoId}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60 ${
        liked
          ? "border-gold bg-gold/15 text-gold"
          : "border-border text-muted-foreground hover:border-gold hover:text-gold"
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
      <span className="tabular-nums">{likes.length}</span>
    </button>
  );
}
