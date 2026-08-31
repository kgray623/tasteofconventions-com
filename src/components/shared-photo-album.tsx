import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Grid3X3, Loader2, Rows3, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoles } from "@/hooks/use-roles";
import { PhotoComments, type PhotoComment } from "@/components/photo-comments";
import { PhotoViewer } from "@/components/photo-viewer";

const BUCKET = "guest-photos";

type GalleryPhoto = {
  id: string;
  guest_name: string;
  caption: string | null;
  created_at: string;
  url: string | null;
  storage_path: string;
  uploaded_by: string | null;
};

/**
 * In-platform shared photo album. Fully self-contained: uploads to the
 * `guest-photos` storage bucket and records a row in `shared_photos`.
 * Comments live in `photo_comments`. Does not touch RSVP, meal, payment or
 * texting data.
 */
export function SharedPhotoAlbum({ guestName }: { guestName?: string | null }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [layout, setLayout] = useState<"feed" | "grid">("feed");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { isAdmin } = useRoles();

  const loadComments = useCallback(async (photoIds: string[]) => {
    if (photoIds.length === 0) {
      setComments([]);
      return;
    }
    const { data } = await supabase
      .from("photo_comments")
      .select("id, photo_id, user_id, commenter_name, comment_text, created_at")
      .in("photo_id", photoIds)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  }, []);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = Boolean(sessionData.session);
    setSignedIn(hasSession);
    setMyUserId(sessionData.session?.user.id ?? null);
    if (!hasSession) {
      setPhotos([]);
      setComments([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("shared_photos")
      .select("id, guest_name, caption, created_at, storage_path, uploaded_by")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    let urls: Array<{ path?: string | null; signedUrl: string | null }> = [];
    if (rows.length > 0) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );
      urls = signed ?? [];
    }
    const urlByPath = new Map(urls.map((u) => [u.path ?? "", u.signedUrl]));
    setPhotos(
      rows.map((r) => ({
        id: r.id,
        guest_name: r.guest_name,
        caption: r.caption,
        created_at: r.created_at,
        storage_path: r.storage_path,
        uploaded_by: r.uploaded_by,
        url: urlByPath.get(r.storage_path) ?? null,
      })),
    );
    await loadComments(rows.map((r) => r.id));
    setLoading(false);
  }, [loadComments]);

  const refreshComments = useCallback(
    () => loadComments(photos.map((p) => p.id)),
    [loadComments, photos],
  );

  const commentsByPhoto = useMemo(() => {
    const map: Record<string, PhotoComment[]> = {};
    for (const c of comments) {
      (map[c.photo_id] ??= []).push(c);
    }
    return map;
  }, [comments]);

  const handleDelete = async (photo: GalleryPhoto) => {
    if (deletingId) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this photo from the shared album?")) return;
    setDeletingId(photo.id);
    try {
      const { error: rowError } = await supabase
        .from("shared_photos")
        .delete()
        .eq("id", photo.id);
      if (rowError) {
        toast.error("Could not remove that photo.");
        return;
      }
      await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      toast.success("Photo removed.");
      setViewerIndex(null);
      await load();
    } finally {
      setDeletingId(null);
    }
  };


  useEffect(() => {
    void load();
    // Invitation-link guests may have their session restored asynchronously
    // (phone cookie -> setSession), so re-read the album when auth changes.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void load();
      else {
        setSignedIn(false);
        setMyUserId(null);
        setPhotos([]);
        setComments([]);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      toast.error("Sign in with your last name and phone number to add photos.");
      return;
    }
    const name = (guestName ?? "").trim() || "Guest";
    setUploading(true);
    let added = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          toast.error(`Could not upload ${file.name}`);
          continue;
        }
        const { error: insertError } = await supabase.from("shared_photos").insert({
          storage_path: path,
          guest_name: name,
          caption: caption.trim() || null,
          uploaded_by: session.user.id,
        });
        if (insertError) {
          toast.error(`Could not save ${file.name}`);
          continue;
        }
        added += 1;
      }
      if (added > 0) {
        toast.success(`${added} photo${added === 1 ? "" : "s"} shared. Thank you!`);
        setCaption("");
        await load();
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Card className="p-5 space-y-4 border-2 border-gold/60">
      <div className="flex items-center gap-2">
        <Camera className="w-5 h-5 text-gold" />
        <h2 className="font-display text-2xl">Share Your Photos</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Add your favorite Taste of Conventions photos to our shared album!
      </p>

      {signedIn === false ? (
        <div className="space-y-2">
          <p className="text-sm text-terracotta">
            Sign in with your last name and phone number to add and browse photos.
          </p>
          <Button asChild className="w-full bg-gold text-ink hover:bg-gold/90">
            <a href="/auth">Sign in to share photos</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            className="bg-card"
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="w-full bg-gold text-ink hover:bg-gold/90"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" /> Upload photos
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Shared album{photos.length > 0 ? ` · ${photos.length}` : ""}
          </p>
          {photos.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={layout === "feed" ? "Switch to grid view" : "Switch to feed view"}
              onClick={() => setLayout((l) => (l === "feed" ? "grid" : "feed"))}
              className="h-8 gap-1.5 text-xs"
            >
              {layout === "feed" ? (
                <>
                  <Grid3X3 className="h-3.5 w-3.5" /> Grid
                </>
              ) : (
                <>
                  <Rows3 className="h-3.5 w-3.5" /> Feed
                </>
              )}
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading photos…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No photos yet — be the first to share one.
          </p>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
              >
                <button
                  type="button"
                  aria-label={`Open photo shared by ${p.guest_name}`}
                  onClick={() => setViewerIndex(i)}
                  className="block h-full w-full"
                >
                  {p.url ? (
                    <img
                      src={p.url}
                      alt={p.caption ? p.caption : `Photo shared by ${p.guest_name}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-ink/70 px-1 py-0.5 text-[10px] text-cream">
                    {p.guest_name}
                  </span>
                </button>
                {myUserId && p.uploaded_by === myUserId ? (
                  <button
                    type="button"
                    aria-label="Delete my photo"
                    disabled={deletingId === p.id}
                    onClick={() => void handleDelete(p)}
                    className="absolute right-1 top-1 rounded-full bg-ink/80 p-1 text-cream hover:bg-terracotta disabled:opacity-50"
                  >
                    {deletingId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {photos.map((p, i) => (
              <div key={p.id} className="space-y-2 rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Posted by {p.guest_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </p>
                  </div>
                  {myUserId && p.uploaded_by === myUserId ? (
                    <button
                      type="button"
                      aria-label="Delete my photo"
                      disabled={deletingId === p.id}
                      onClick={() => void handleDelete(p)}
                      className="rounded-full bg-ink/80 p-1 text-cream hover:bg-terracotta disabled:opacity-50"
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  aria-label={`Open photo shared by ${p.guest_name}`}
                  onClick={() => setViewerIndex(i)}
                  className="block w-full overflow-hidden rounded-md border border-border bg-muted"
                >
                  {p.url ? (
                    <img
                      src={p.url}
                      alt={p.caption ? p.caption : `Photo shared by ${p.guest_name}`}
                      loading="lazy"
                      className="max-h-80 w-full object-cover"
                    />
                  ) : null}
                </button>

                {p.caption ? <p className="text-sm">{p.caption}</p> : null}

                <PhotoComments
                  photoId={p.id}
                  comments={commentsByPhoto[p.id] ?? []}
                  myUserId={myUserId}
                  isAdmin={isAdmin}
                  guestName={guestName}
                  onChanged={refreshComments}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <PhotoViewer
        photos={photos}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        commentsByPhoto={commentsByPhoto}
        myUserId={myUserId}
        isAdmin={isAdmin}
        guestName={guestName}
        onCommentsChanged={refreshComments}
      />
    </Card>
  );
}
