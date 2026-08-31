import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PhotoComments, type PhotoComment } from "@/components/photo-comments";

export type ViewerPhoto = {
  id: string;
  guest_name: string;
  caption: string | null;
  url: string | null;
};

/**
 * Full-screen photo viewer with next/previous navigation (buttons, arrow keys,
 * swipe) and the per-photo comment thread. Purely presentational: photo rows
 * and signed URLs come from the album component.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  commentsByPhoto,
  myUserId,
  isAdmin,
  guestName,
  onCommentsChanged,
}: {
  photos: ViewerPhoto[];
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  commentsByPhoto: Record<string, PhotoComment[]>;
  myUserId: string | null;
  isAdmin: boolean;
  guestName?: string | null;
  onCommentsChanged: () => void | Promise<void>;
}) {
  const open = index !== null && index >= 0 && index < photos.length;
  const touchStartX = useRef<number | null>(null);

  const step = (delta: number) => {
    if (index === null || photos.length === 0) return;
    const next = (index + delta + photos.length) % photos.length;
    onIndexChange(next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
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
  const comments = commentsByPhoto[photo.id] ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl gap-0 bg-ink p-0 text-cream border-ink">
        <DialogTitle className="sr-only">
          Photo {index + 1} of {photos.length} shared by {photo.guest_name}
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
          {photo.url ? (
            <img
              src={photo.url}
              alt={photo.caption ? photo.caption : `Photo shared by ${photo.guest_name}`}
              className="mx-auto max-h-[60vh] w-auto max-w-full object-contain"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-cream/70">
              Photo unavailable
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
          <div>
            <p className="text-sm font-medium">Posted by {photo.guest_name}</p>
            {photo.caption ? (
              <p className="text-sm text-muted-foreground">{photo.caption}</p>
            ) : null}
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
