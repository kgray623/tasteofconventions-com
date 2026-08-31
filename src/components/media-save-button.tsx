import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Turns "Kari Gray" into "kari-gray" for use inside a filename. */
function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "guest"
  );
}

/** Extension from the signed storage URL path (query string stripped). */
function extensionFrom(url: string, isVideo: boolean) {
  const path = url.split("?")[0] ?? "";
  const match = path.match(/\.([a-z0-9]{2,5})$/i);
  return (match?.[1] ?? (isVideo ? "mp4" : "jpg")).toLowerCase();
}

/**
 * Save/download button for one album item. Downloads the signed storage URL
 * as a blob so the browser saves the file instead of navigating to it; when
 * that is not possible (offline, expired link, browser restrictions) it opens
 * the file in a new tab so it can be saved with a long-press / share sheet.
 */
export function MediaSaveButton({
  url,
  guestName,
  itemNumber,
  isVideo,
  className,
  iconOnly = false,
}: {
  url: string | null;
  guestName: string;
  itemNumber: number;
  isVideo: boolean;
  className?: string;
  /** Compact form used on grid tiles: icon only, no visible label. */
  iconOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const filename = url
    ? `taste-of-conventions-${slug(guestName)}-${itemNumber}.${extensionFrom(url, isVideo)}`
    : "";

  const save = async () => {
    if (!url || busy) return;
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a beat to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      toast.success("Saved to your device.");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      toast.info("Opened in a new tab — press and hold the file to save it.");
    } finally {
      setBusy(false);
    }
  };

  if (!url) return null;

  return (
    <button
      type="button"
      aria-label={isVideo ? "Save this video" : "Save this photo"}
      data-testid="media-save-button"
      data-filename={filename}
      disabled={busy}
      onClick={() => void save()}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
      }
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {iconOnly ? null : "Save"}
    </button>
  );
}
