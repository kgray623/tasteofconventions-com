
CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  country text,
  session_id text NOT NULL,
  is_unique_session boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX page_visits_created_at_idx ON public.page_visits(created_at DESC);
CREATE INDEX page_visits_session_idx ON public.page_visits(session_id);

GRANT ALL ON public.page_visits TO service_role;

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read page visits"
  ON public.page_visits
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
