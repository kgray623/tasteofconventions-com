ALTER TABLE public.shared_photos
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

ALTER TABLE public.shared_photos
  DROP CONSTRAINT IF EXISTS shared_photos_media_type_check;
ALTER TABLE public.shared_photos
  ADD CONSTRAINT shared_photos_media_type_check CHECK (media_type IN ('image','video'));

CREATE TABLE IF NOT EXISTS public.photo_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL REFERENCES public.shared_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  liker_name text NOT NULL DEFAULT 'Guest',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (photo_id, user_id)
);

CREATE INDEX IF NOT EXISTS photo_likes_photo_id_idx ON public.photo_likes (photo_id);

GRANT SELECT, INSERT, DELETE ON public.photo_likes TO authenticated;
GRANT ALL ON public.photo_likes TO service_role;

ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view likes"
  ON public.photo_likes FOR SELECT TO authenticated
  USING (public.is_event_participant(auth.uid()));

CREATE POLICY "Participants can like as themselves"
  ON public.photo_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_event_participant(auth.uid()));

CREATE POLICY "Owners and admins can remove likes"
  ON public.photo_likes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );