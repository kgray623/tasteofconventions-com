import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PhotoComments, type PhotoComment } from "@/components/photo-comments";
import { PhotoLikes, type PhotoLike } from "@/components/photo-likes";
import { MediaSaveButton } from "@/components/media-save-button";

export type ViewerPhoto = {
  id: string;
  guest_name: string;
  caption: string | null;
  url: string | null;
  media_type: string;
};

/**
 * Full-screen viewer with next/previous navigation (buttons, arrow keys,
 * swipe), inline video playback and the per-item comment thread + likes.
 * Purely presentational: rows and signed URLs come from the album component.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  commentsByPhoto,
  likesByPhoto,
  myUserId,
  isAdmin,
  guestName,
  onCommentsChanged,
  onLikesChanged,
}: {
  photos: ViewerPhoto[];
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  commentsByPhoto: Record<string, PhotoComment[]>;
  likesByPhoto: Record<string, PhotoLike[]>;
  myUserId: string | null;
  isAdmin: boolean;
  guestName?: string | null;
  onCommentsChanged: () => void | Promise<void>;
  onLikesChanged: () => void | Promise<void>;
}) {
  const open = index !== null && index >= 0 && index < photos.length;
  const touchStartX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const step = (delta: number) => {
    if (index === null || photos.length === 0) return;
    // Stop playback before moving on so audio never continues off-screen.
    videoRef.current?.pause();
    const next = (index + delta + photos.length) % photos.length;
    onIndexChange(next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, photos.length]);

  if (!open || index === null) {
    return (
      <Dialog open={false} onOpenChange={() => onClose()}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }

  const photo = photos[index];
  const isVideo = photo.media_type === "video";
  const comments = commentsByPhoto[photo.id] ?? [];
  const likes = likesByPhoto[photo.id] ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 bg-ink p-0 text-cream border-ink">
        <DialogTitle className="sr-only">
          {isVideo ? "Video" : "Photo"} {index + 1} of {photos.length} shared by {photo.guest_name}
        </DialogTitle>

        <div
          className="relative bg-ink"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX ?? null;
            touchStartX.current = null;
            if (start === null || end === null) return;
            const dx = end - start;
            if (Math.abs(dx) < 40) return;
            step(dx < 0 ? 1 : -1);
          }}
        >
          {photo.url && isVideo ? (
            <video
              key={photo.id}
              ref={videoRef}
              src={photo.url}
              controls
              playsInline
              preload="metadata"
              data-testid="viewer-video"
              className="mx-auto max-h-[60vh] w-auto max-w-full bg-black"
            />
          ) : photo.url ? (
            <img
              src={photo.url}
              alt={photo.caption ? photo.caption : `Photo shared by ${photo.guest_name}`}
              className="mx-auto max-h-[60vh] w-auto max-w-full object-contain"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-cream/70">
              {isVideo ? "Video unavailable" : "Photo unavailable"}
            </div>
          )}

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => step(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 p-2 text-cream hover:bg-gold hover:text-ink"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => step(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 p-2 text-cream hover:bg-gold hover:text-ink"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <span
            data-testid="photo-counter"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs tabular-nums text-cream"
          >
            {index + 1} of {photos.length}
          </span>
        </div>

        <div className="space-y-3 bg-card p-4 text-foreground">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">Posted by {photo.guest_name}</p>
              {photo.caption ? (
                <p className="text-sm text-muted-foreground">{photo.caption}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PhotoLikes
                photoId={photo.id}
                likes={likes}
                myUserId={myUserId}
                guestName={guestName}
                onChanged={onLikesChanged}
              />
              <MediaSaveButton
                url={photo.url}
                guestName={photo.guest_name}
                itemNumber={index + 1}
                isVideo={photo.media_type === "video"}
              />
            </div>
          </div>
          <PhotoComments
            photoId={photo.id}
            comments={comments}
            myUserId={myUserId}
            isAdmin={isAdmin}
            guestName={guestName}
            onChanged={onCommentsChanged}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
