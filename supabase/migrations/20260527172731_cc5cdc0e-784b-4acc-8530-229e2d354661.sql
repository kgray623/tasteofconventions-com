CREATE TABLE public.category_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_category_messages_category ON public.category_messages(category_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_messages TO authenticated;
GRANT ALL ON public.category_messages TO service_role;

ALTER TABLE public.category_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category chat readable by volunteers admin or team"
ON public.category_messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'team'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.category_assignments a
    WHERE a.category_id = category_messages.category_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "volunteers admin or team post in category chat"
ON public.category_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'team'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.category_assignments a
      WHERE a.category_id = category_messages.category_id
        AND a.user_id = auth.uid()
    )
  )
);

CREATE POLICY "author or admin deletes category messages"
ON public.category_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.category_messages;
ALTER TABLE public.category_messages REPLICA IDENTITY FULL;