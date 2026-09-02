import { useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveAlbumPosterName } from "@/lib/album-poster-name";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PhotoComment = {
  id: string;
  photo_id: string;
  user_id: string;
  commenter_name: string;
  comment_text: string;
  created_at: string;
};

/**
 * Comment list + add form for a single shared photo. Reads/writes go through
 * the browser Supabase client with RLS (event participants only). Reused in
 * both the album feed card and the full-screen viewer.
 */
export function PhotoComments({
  photoId,
  comments,
  myUserId,
  isAdmin,
  onCommentAdded,
  onChanged,
  compact,
}: {
  photoId: string;
  comments: PhotoComment[];
  myUserId: string | null;
  isAdmin: boolean;
  onCommentAdded: (comment: PhotoComment) => void;
  onChanged: () => void | Promise<void>;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const submit = async () => {
    const body = text.trim();
    if (!body || saving) return;
    if (!myUserId) {
      toast.error("Sign in with your last name and phone number to comment.");
      return;
    }
    setSaving(true);
    try {
      // Label the comment with the signed-in person, not the guest name of the
      // invitation page this album is rendered on.
      const commenterName = await resolveAlbumPosterName(myUserId);
      const { data: inserted, error } = await supabase
        .from("photo_comments")
        .insert({
          photo_id: photoId,
          user_id: myUserId,
          commenter_name: commenterName,
          comment_text: body,
        })
        .select("id, photo_id, user_id, commenter_name, comment_text, created_at")
        .single();

      if (error || !inserted) {
        toast.error("Could not post that comment.");
        return;
      }
      setText("");
      onCommentAdded(inserted);
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (comment: PhotoComment) => {
    if (deletingId) return;
    setDeletingId(comment.id);
    try {
      const { error } = await supabase.from("photo_comments").delete().eq("id", comment.id);
      if (error) {
        toast.error("Could not remove that comment.");
        return;
      }
      await onChanged();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" />
        {comments.length === 0
          ? "No comments yet"
          : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </p>

      {comments.length > 0 && (
        <ul className={`space-y-1.5 ${compact ? "max-h-40 overflow-y-auto pr-1" : ""}`}>
          {comments.map((c) => (
            <li key={c.id} className="group flex items-start gap-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{c.commenter_name}</span>{" "}
                <span className="text-muted-foreground">{c.comment_text}</span>
              </span>
              {myUserId && (c.user_id === myUserId || isAdmin) ? (
                <button
                  type="button"
                  aria-label="Delete comment"
                  disabled={deletingId === c.id}
                  onClick={() => void remove(c)}
                  className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-terracotta disabled:opacity-50"
                >
                  {deletingId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="h-9 bg-card text-sm"
        />
        <Button
          type="button"
          size="sm"
          disabled={saving || text.trim().length === 0}
          onClick={() => void submit()}
          className="h-9 bg-gold text-ink hover:bg-gold/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
