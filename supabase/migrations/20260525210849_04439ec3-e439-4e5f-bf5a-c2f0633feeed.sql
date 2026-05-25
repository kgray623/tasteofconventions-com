
-- 1) Remove guest_messages from Realtime publication.
-- guest_messages is not consumed via Realtime anywhere in the app; removing
-- it eliminates the unrestricted Realtime broadcast surface. Table-level RLS
-- continues to restrict reads via normal queries.
ALTER PUBLICATION supabase_realtime DROP TABLE public.guest_messages;

-- 2) Tighten entertainment_submissions public INSERT policy.
-- The previous WITH CHECK was `true`, allowing arbitrary video_path values
-- and unbounded text fields. Replace with a constrained check that:
--   * Forces video_path to match the same UUID-filename pattern enforced by
--     the storage INSERT policy (so submissions can only reference paths
--     that conform to legitimately uploaded objects).
--   * Caps text field lengths to sensible bounds.
DROP POLICY IF EXISTS "anyone can submit entertainment" ON public.entertainment_submissions;

CREATE POLICY "anyone can submit entertainment"
ON public.entertainment_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  video_path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[A-Za-z0-9]+$'
  AND char_length(name) BETWEEN 1 AND 120
  AND (email IS NULL OR char_length(email) <= 200)
  AND (phone IS NULL OR char_length(phone) <= 40)
  AND (talent IS NULL OR char_length(talent) <= 200)
  AND (notes IS NULL OR char_length(notes) <= 2000)
);
