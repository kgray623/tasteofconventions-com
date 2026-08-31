CREATE TABLE public.photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.shared_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  commenter_name text NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photo_comments_photo_id_created_at_idx ON public.photo_comments (photo_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_comments TO authenticated;
GRANT ALL ON public.photo_comments TO service_role;

ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event participants can view photo comments"
  ON public.photo_comments FOR SELECT TO authenticated
  USING (public.is_event_participant(auth.uid()));

CREATE POLICY "Participants can add their own photo comments"
  ON public.photo_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_event_participant(auth.uid()));

CREATE POLICY "Users can edit their own photo comments"
  ON public.photo_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own comments and admins delete any"
  ON public.photo_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER photo_comments_set_updated_at
  BEFORE UPDATE ON public.photo_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();